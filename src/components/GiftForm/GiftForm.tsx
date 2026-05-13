"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { type FormEvent, useState } from "react";

import { Checkbox } from "@/components/Form/Checkbox";
import { Input } from "@/components/Form/Input";
import { Textarea } from "@/components/Form/Textarea";
import { TimezonePreview } from "@/components/Form/TimezonePreview";
import type { BookingGiftFormContent } from "@/data/defaults";
import type { ReadingId } from "@/lib/analytics";
import { track } from "@/lib/analytics";
import {
  BOOKING_API_GIFT_ROUTE,
  GIFT_DELIVERY,
  HONEYPOT_FIELD,
} from "@/lib/booking/constants";
import type { GiftDeliveryMethod } from "@/lib/booking/persistence/repository";

type FieldErrors = Partial<Record<string, string>>;

const GIFT_MESSAGE_MAX = 280;
const GIFT_MESSAGE_COUNTER_REVEAL = 220;

type Props = {
  readingSlug: ReadingId;
  readingName: string;
  readingPriceDisplay: string;
  copy: BookingGiftFormContent;
};

export function GiftForm({ readingSlug, readingName, readingPriceDisplay, copy }: Props) {
  const [deliveryMethod, setDeliveryMethod] = useState<GiftDeliveryMethod>(GIFT_DELIVERY.selfSend);
  const [purchaserFirstName, setPurchaserFirstName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftSendAt, setGiftSendAt] = useState("");
  const [art6Consent, setArt6Consent] = useState(false);
  const [coolingOffConsent, setCoolingOffConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [topLevelError, setTopLevelError] = useState<string | null>(null);
  const [antiAbuseHit, setAntiAbuseHit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileBypass =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS === "1";

  const focusOrder: Array<[keyof FieldErrors, string]> = [
    ["purchaserFirstName", "gift-purchaser-first-name"],
    ["purchaserEmail", "gift-purchaser-email"],
    ["recipientName", "gift-recipient-name"],
    ["recipientEmail", "gift-recipient-email"],
    ["giftSendAt", "gift-send-at"],
    ["art6Consent", "gift-art6-consent"],
    ["coolingOffConsent", "gift-cooling-off-consent"],
    ["termsConsent", "gift-terms-consent"],
  ];

  function focusFirstError(errs: FieldErrors): void {
    for (const [key, elementId] of focusOrder) {
      if (errs[key as string]) {
        const el = document.getElementById(elementId);
        if (el instanceof HTMLElement) {
          el.focus();
          return;
        }
      }
    }
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!purchaserFirstName.trim()) {
      errs.purchaserFirstName = copy.firstNameRequiredError;
    }
    if (!purchaserEmail.trim()) {
      errs.purchaserEmail = copy.emailInvalidError;
    }
    if (deliveryMethod === GIFT_DELIVERY.scheduled) {
      if (!recipientName.trim()) errs.recipientName = copy.recipientNameRequiredError;
      if (!recipientEmail.trim()) errs.recipientEmail = copy.recipientEmailRequiredError;
      if (!giftSendAt) errs.giftSendAt = copy.sendAtRequiredError;
    }
    if (!art6Consent) errs.art6Consent = copy.consentRequiredError;
    if (!coolingOffConsent) errs.coolingOffConsent = copy.consentRequiredError;
    if (!termsConsent) errs.termsConsent = copy.consentRequiredError;
    return errs;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAntiAbuseHit(false);
    setTopLevelError(null);

    const errs = validate();
    setFieldErrors(errs);

    track("gift_submit_click", {
      reading_id: readingSlug,
      delivery_method: deliveryMethod,
      validation_pass: Object.keys(errs).length === 0,
    });

    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }

    const token = turnstileBypass ? "bypass" : turnstileToken;
    if (!token) {
      setTopLevelError(copy.verificationError);
      return;
    }

    setSubmitting(true);
    try {
      const giftSendAtIso =
        deliveryMethod === GIFT_DELIVERY.scheduled && giftSendAt
          ? new Date(giftSendAt).toISOString()
          : undefined;
      const body: Record<string, unknown> = {
        readingSlug,
        purchaserEmail: purchaserEmail.trim().toLowerCase(),
        purchaserFirstName: purchaserFirstName.trim(),
        deliveryMethod,
        art6Consent,
        coolingOffConsent,
        termsConsent,
        turnstileToken: token,
        [HONEYPOT_FIELD]: "",
      };
      if (recipientName.trim()) body.recipientName = recipientName.trim();
      if (recipientEmail.trim())
        body.recipientEmail = recipientEmail.trim().toLowerCase();
      if (giftMessage.trim()) body.giftMessage = giftMessage.trim();
      if (giftSendAtIso) body.giftSendAt = giftSendAtIso;

      const res = await fetch(BOOKING_API_GIFT_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        paymentUrl?: string;
        fieldErrors?: Record<string, string>;
        error?: string;
      };

      if (res.status === 422) {
        setAntiAbuseHit(true);
        track("gift_submit_error", {
          reading_id: readingSlug,
          delivery_method: deliveryMethod,
          error_code: "anti_abuse_cap",
        });
        setSubmitting(false);
        return;
      }
      if (!res.ok || !json.paymentUrl) {
        setFieldErrors(json.fieldErrors ?? {});
        setTopLevelError(json.error ?? copy.genericError);
        track("gift_submit_error", {
          reading_id: readingSlug,
          delivery_method: deliveryMethod,
          error_code: String(res.status),
        });
        setSubmitting(false);
        return;
      }

      track("gift_submit_success", {
        reading_id: readingSlug,
        delivery_method: deliveryMethod,
      });
      window.location.assign(json.paymentUrl);
    } catch {
      setTopLevelError(copy.networkError);
      track("gift_submit_error", {
        reading_id: readingSlug,
        delivery_method: deliveryMethod,
        error_code: "network",
      });
      setSubmitting(false);
    }
  }

  const messageRemaining = GIFT_MESSAGE_MAX - giftMessage.length;
  const showCounter = giftMessage.length >= GIFT_MESSAGE_COUNTER_REVEAL;
  const counterTone =
    giftMessage.length >= GIFT_MESSAGE_MAX
      ? "text-j-text-heading font-medium"
      : giftMessage.length >= 260
        ? "text-j-rose"
        : "text-j-text-muted";

  const submitLabel =
    deliveryMethod === GIFT_DELIVERY.selfSend
      ? copy.submitButtonSelfSend
      : copy.submitButtonScheduled;

  const isScheduled = deliveryMethod === GIFT_DELIVERY.scheduled;

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl mx-auto flex flex-col gap-8 px-6">
      <header className="text-center">
        <span aria-hidden="true" className="block text-j-accent text-xl mb-2">
          ✦
        </span>
        <h1 className="font-display italic font-medium text-[clamp(2rem,5vw,2.75rem)] leading-tight text-j-text-heading">
          {copy.heading}
        </h1>
        {copy.subheading ? (
          <p className="font-display italic text-base text-j-text-muted mt-3">
            {copy.subheading}
          </p>
        ) : null}
        <p className="font-body text-sm text-j-text-muted mt-4">
          {readingName} · {readingPriceDisplay}
        </p>
      </header>

      {/* Honeypot — invisible to humans */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        defaultValue=""
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[10000px] w-px h-px overflow-hidden"
        aria-hidden="true"
      />

      <fieldset className="flex flex-col gap-3">
        <legend
          id="delivery-method-label"
          className="font-display italic text-lg text-j-text-heading mb-1"
        >
          {copy.deliveryMethodLabel}
        </legend>
        <div role="radiogroup" aria-labelledby="delivery-method-label" className="flex flex-col gap-3">
          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="radio"
              name="deliveryMethod"
              value={GIFT_DELIVERY.selfSend}
              checked={deliveryMethod === GIFT_DELIVERY.selfSend}
              onChange={() => setDeliveryMethod(GIFT_DELIVERY.selfSend)}
              className="mt-1 accent-j-deep"
            />
            <span className="flex-1">
              <span className="block font-display italic text-base text-j-text-heading">
                ✦ {copy.deliveryMethodSelfSendLabel}
              </span>
              <span className="block font-body text-sm text-j-text-muted">
                {copy.deliveryMethodSelfSendHelper}
              </span>
            </span>
          </label>
          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="radio"
              name="deliveryMethod"
              value={GIFT_DELIVERY.scheduled}
              checked={deliveryMethod === GIFT_DELIVERY.scheduled}
              onChange={() => setDeliveryMethod(GIFT_DELIVERY.scheduled)}
              className="mt-1 accent-j-deep"
            />
            <span className="flex-1">
              <span className="block font-display italic text-base text-j-text-heading">
                ✦ {copy.deliveryMethodScheduledLabel}
              </span>
              <span className="block font-body text-sm text-j-text-muted">
                {copy.deliveryMethodScheduledHelper}
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="border-t border-j-border-gold/20" aria-hidden="true" />

      <div className="flex flex-col gap-5">
        <Input
          id="gift-purchaser-first-name"
          name="purchaserFirstName"
          label={copy.purchaserFirstNameLabel}
          value={purchaserFirstName}
          onChange={setPurchaserFirstName}
          helpText={copy.purchaserFirstNameHelper}
          error={fieldErrors.purchaserFirstName}
        />

        <Input
          id="gift-purchaser-email"
          name="purchaserEmail"
          label={copy.purchaserEmailLabel}
          type="email"
          value={purchaserEmail}
          onChange={setPurchaserEmail}
          autoComplete="email"
          helpText={copy.purchaserEmailHelper}
          error={fieldErrors.purchaserEmail}
        />

        <Input
          id="gift-recipient-name"
          name="recipientName"
          label={isScheduled ? copy.recipientNameLabelScheduled : copy.recipientNameLabelSelfSend}
          value={recipientName}
          onChange={setRecipientName}
          placeholder={isScheduled ? undefined : copy.recipientNamePlaceholderSelfSend}
          helpText={isScheduled ? copy.recipientNameHelperScheduled : undefined}
          error={fieldErrors.recipientName}
        />

        {isScheduled ? (
          <Input
            id="gift-recipient-email"
            name="recipientEmail"
            label={copy.recipientEmailLabel}
            type="email"
            value={recipientEmail}
            onChange={setRecipientEmail}
            autoComplete="off"
            helpText={copy.recipientEmailHelper}
            error={fieldErrors.recipientEmail}
          />
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Textarea
            id="gift-message"
            name="giftMessage"
            label={copy.giftMessageLabel}
            value={giftMessage}
            onChange={(value) => setGiftMessage(value.slice(0, GIFT_MESSAGE_MAX))}
            rows={5}
            placeholder={copy.giftMessagePlaceholder}
            maxLength={GIFT_MESSAGE_MAX}
          />
          {showCounter ? (
            <span
              data-testid="gift-message-counter"
              className={`self-end font-body text-xs ${counterTone}`}
            >
              {messageRemaining}
            </span>
          ) : null}
        </div>

        {isScheduled ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="font-display italic text-base text-j-text-heading">
              {copy.sendAtSectionLabel}
            </legend>
            <label htmlFor="gift-send-at" className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-j-text-muted">
                {copy.sendAtCustomLabel}
              </span>
              <input
                id="gift-send-at"
                type="datetime-local"
                value={giftSendAt}
                onChange={(e) => setGiftSendAt(e.target.value)}
                aria-describedby={
                  fieldErrors.giftSendAt ? "gift-send-at-error" : undefined
                }
                aria-invalid={Boolean(fieldErrors.giftSendAt)}
                className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
              />
              {fieldErrors.giftSendAt ? (
                <span id="gift-send-at-error" className="font-body text-xs text-j-rose">
                  {fieldErrors.giftSendAt}
                </span>
              ) : null}
              <TimezonePreview value={giftSendAt} template={copy.sendAtTimezoneHint} />
            </label>
          </fieldset>
        ) : null}
      </div>

      <div className="border-t border-j-border-gold/20" aria-hidden="true" />

      <div className="flex flex-col gap-3">
        <p className="font-display italic text-base text-j-text-muted">
          {copy.consentIntro}
        </p>
        <p className="font-body text-sm text-j-text leading-relaxed whitespace-pre-line">
          {copy.nonRefundableNotice}
        </p>
        <Checkbox
          id="gift-art6-consent"
          name="art6Consent"
          checked={art6Consent}
          onChange={setArt6Consent}
          error={fieldErrors.art6Consent}
        >
          {copy.art6ConsentLabel}
        </Checkbox>
        <Checkbox
          id="gift-cooling-off-consent"
          name="coolingOffConsent"
          checked={coolingOffConsent}
          onChange={setCoolingOffConsent}
          error={fieldErrors.coolingOffConsent}
        >
          {copy.coolingOffConsentLabel}
        </Checkbox>
        <Checkbox
          id="gift-terms-consent"
          name="termsConsent"
          checked={termsConsent}
          onChange={setTermsConsent}
          error={fieldErrors.termsConsent}
        >
          {copy.termsConsentLabel}
        </Checkbox>
      </div>

      {antiAbuseHit ? (
        <div
          role="alert"
          className="border-l-4 border-j-rose bg-j-blush/30 px-4 py-3 rounded-sm"
        >
          <p className="font-display italic text-base text-j-text-heading">
            {copy.antiAbuseCapHeading}
          </p>
          <p className="font-body text-sm text-j-text mt-1">{copy.antiAbuseCapBody}</p>
        </div>
      ) : null}

      {topLevelError ? (
        <p role="alert" className="font-body text-sm text-j-rose">
          {topLevelError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center min-h-14 px-10 py-4 bg-j-deep text-j-cream rounded-[50px] font-display italic font-medium text-base hover:bg-j-midnight transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent"
      >
        {submitting ? (
          copy.loadingStateCopy
        ) : (
          <>
            <span aria-hidden="true">✦</span> {submitLabel}
          </>
        )}
      </button>

      {turnstileSiteKey ? (
        <Turnstile
          siteKey={turnstileSiteKey}
          options={{ size: "invisible" }}
          onSuccess={(token) => setTurnstileToken(token)}
          onError={() => setTurnstileToken(null)}
        />
      ) : null}
    </form>
  );
}
