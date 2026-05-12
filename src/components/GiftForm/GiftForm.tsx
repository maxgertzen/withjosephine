"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { type FormEvent, useRef, useState } from "react";

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

  // Refs for focus-on-error a11y. After validate() returns errors, we focus
  // the first errored field so screen-reader users hear the message
  // immediately and keyboard users land where they need to type.
  const purchaserFirstNameRef = useRef<HTMLInputElement>(null);
  const purchaserEmailRef = useRef<HTMLInputElement>(null);
  const recipientNameRef = useRef<HTMLInputElement>(null);
  const recipientEmailRef = useRef<HTMLInputElement>(null);
  const giftSendAtRef = useRef<HTMLInputElement>(null);
  const art6ConsentRef = useRef<HTMLInputElement>(null);
  const coolingOffConsentRef = useRef<HTMLInputElement>(null);
  const termsConsentRef = useRef<HTMLInputElement>(null);

  // Ordered focus targets — first matching error wins.
  const focusOrder: Array<[keyof FieldErrors, React.RefObject<HTMLInputElement | null>]> = [
    ["purchaserFirstName", purchaserFirstNameRef],
    ["purchaserEmail", purchaserEmailRef],
    ["recipientName", recipientNameRef],
    ["recipientEmail", recipientEmailRef],
    ["giftSendAt", giftSendAtRef],
    ["art6Consent", art6ConsentRef],
    ["coolingOffConsent", coolingOffConsentRef],
    ["termsConsent", termsConsentRef],
  ];

  function focusFirstError(errs: FieldErrors): void {
    for (const [key, ref] of focusOrder) {
      if (errs[key as string] && ref.current) {
        ref.current.focus();
        return;
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
        <label htmlFor="gift-purchaser-first-name" className="flex flex-col gap-1.5">
          <span className="font-display italic text-base text-j-text-heading">
            {copy.purchaserFirstNameLabel}
          </span>
          <input
            id="gift-purchaser-first-name"
            ref={purchaserFirstNameRef}
            type="text"
            value={purchaserFirstName}
            onChange={(e) => setPurchaserFirstName(e.target.value)}
            maxLength={80}
            aria-describedby={
              fieldErrors.purchaserFirstName
                ? "gift-purchaser-first-name-error gift-purchaser-first-name-help"
                : "gift-purchaser-first-name-help"
            }
            aria-invalid={Boolean(fieldErrors.purchaserFirstName)}
            className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
          />
          <span id="gift-purchaser-first-name-help" className="font-body text-xs text-j-text-muted">
            {copy.purchaserFirstNameHelper}
          </span>
          {fieldErrors.purchaserFirstName ? (
            <span id="gift-purchaser-first-name-error" className="font-body text-xs text-j-rose">
              {fieldErrors.purchaserFirstName}
            </span>
          ) : null}
        </label>

        <label htmlFor="gift-purchaser-email" className="flex flex-col gap-1.5">
          <span className="font-display italic text-base text-j-text-heading">
            {copy.purchaserEmailLabel}
          </span>
          <input
            id="gift-purchaser-email"
            ref={purchaserEmailRef}
            type="email"
            value={purchaserEmail}
            onChange={(e) => setPurchaserEmail(e.target.value)}
            autoComplete="email"
            aria-describedby={
              fieldErrors.purchaserEmail
                ? "gift-purchaser-email-error gift-purchaser-email-help"
                : "gift-purchaser-email-help"
            }
            aria-invalid={Boolean(fieldErrors.purchaserEmail)}
            className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
          />
          <span id="gift-purchaser-email-help" className="font-body text-xs text-j-text-muted">
            {copy.purchaserEmailHelper}
          </span>
          {fieldErrors.purchaserEmail ? (
            <span id="gift-purchaser-email-error" className="font-body text-xs text-j-rose">
              {fieldErrors.purchaserEmail}
            </span>
          ) : null}
        </label>

        <label htmlFor="gift-recipient-name" className="flex flex-col gap-1.5">
          <span className="font-display italic text-base text-j-text-heading">
            {isScheduled ? copy.recipientNameLabelScheduled : copy.recipientNameLabelSelfSend}
          </span>
          <input
            id="gift-recipient-name"
            ref={recipientNameRef}
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            maxLength={80}
            placeholder={
              isScheduled ? undefined : copy.recipientNamePlaceholderSelfSend
            }
            aria-describedby={
              fieldErrors.recipientName
                ? isScheduled
                  ? "gift-recipient-name-error gift-recipient-name-help"
                  : "gift-recipient-name-error"
                : isScheduled
                  ? "gift-recipient-name-help"
                  : undefined
            }
            aria-invalid={Boolean(fieldErrors.recipientName)}
            className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
          />
          {isScheduled ? (
            <span id="gift-recipient-name-help" className="font-body text-xs text-j-text-muted">
              {copy.recipientNameHelperScheduled}
            </span>
          ) : null}
          {fieldErrors.recipientName ? (
            <span id="gift-recipient-name-error" className="font-body text-xs text-j-rose">
              {fieldErrors.recipientName}
            </span>
          ) : null}
        </label>

        {isScheduled ? (
          <label htmlFor="gift-recipient-email" className="flex flex-col gap-1.5">
            <span className="font-display italic text-base text-j-text-heading">
              {copy.recipientEmailLabel}
            </span>
            <input
              id="gift-recipient-email"
              ref={recipientEmailRef}
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              autoComplete="off"
              aria-describedby={
                fieldErrors.recipientEmail
                  ? "gift-recipient-email-error gift-recipient-email-help"
                  : "gift-recipient-email-help"
              }
              aria-invalid={Boolean(fieldErrors.recipientEmail)}
              className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
            />
            <span id="gift-recipient-email-help" className="font-body text-xs text-j-text-muted">
              {copy.recipientEmailHelper}
            </span>
            {fieldErrors.recipientEmail ? (
              <span id="gift-recipient-email-error" className="font-body text-xs text-j-rose">
                {fieldErrors.recipientEmail}
              </span>
            ) : null}
          </label>
        ) : null}

        <label htmlFor="gift-message" className="flex flex-col gap-1.5">
          <span className="font-display italic text-base text-j-text-heading">
            {copy.giftMessageLabel}
          </span>
          <textarea
            id="gift-message"
            value={giftMessage}
            onChange={(e) =>
              setGiftMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX))
            }
            maxLength={GIFT_MESSAGE_MAX}
            placeholder={copy.giftMessagePlaceholder}
            className="min-h-32 rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base italic text-j-text placeholder:italic placeholder:text-j-text-muted focus:outline-none focus:border-j-accent"
          />
          {showCounter ? (
            <span
              data-testid="gift-message-counter"
              className={`self-end font-body text-xs ${counterTone}`}
            >
              {messageRemaining}
            </span>
          ) : null}
        </label>

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
                ref={giftSendAtRef}
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
        <label htmlFor="gift-art6-consent" className="flex gap-3 items-start py-2 cursor-pointer">
          <input
            id="gift-art6-consent"
            ref={art6ConsentRef}
            type="checkbox"
            checked={art6Consent}
            onChange={(e) => setArt6Consent(e.target.checked)}
            aria-describedby={fieldErrors.art6Consent ? "gift-art6-consent-error" : undefined}
            aria-invalid={Boolean(fieldErrors.art6Consent)}
            className="mt-1 accent-j-deep"
          />
          <span className="flex-1 font-body text-sm text-j-text">
            {copy.art6ConsentLabel}
          </span>
        </label>
        {fieldErrors.art6Consent ? (
          <span id="gift-art6-consent-error" className="font-body text-xs text-j-rose">
            {fieldErrors.art6Consent}
          </span>
        ) : null}
        <label htmlFor="gift-cooling-off-consent" className="flex gap-3 items-start py-2 cursor-pointer">
          <input
            id="gift-cooling-off-consent"
            ref={coolingOffConsentRef}
            type="checkbox"
            checked={coolingOffConsent}
            onChange={(e) => setCoolingOffConsent(e.target.checked)}
            aria-describedby={
              fieldErrors.coolingOffConsent ? "gift-cooling-off-consent-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.coolingOffConsent)}
            className="mt-1 accent-j-deep"
          />
          <span className="flex-1 font-body text-sm text-j-text">
            {copy.coolingOffConsentLabel}
          </span>
        </label>
        {fieldErrors.coolingOffConsent ? (
          <span id="gift-cooling-off-consent-error" className="font-body text-xs text-j-rose">
            {fieldErrors.coolingOffConsent}
          </span>
        ) : null}
        <label htmlFor="gift-terms-consent" className="flex gap-3 items-start py-2 cursor-pointer">
          <input
            id="gift-terms-consent"
            ref={termsConsentRef}
            type="checkbox"
            checked={termsConsent}
            onChange={(e) => setTermsConsent(e.target.checked)}
            aria-describedby={fieldErrors.termsConsent ? "gift-terms-consent-error" : undefined}
            aria-invalid={Boolean(fieldErrors.termsConsent)}
            className="mt-1 accent-j-deep"
          />
          <span className="flex-1 font-body text-sm text-j-text">
            {copy.termsConsentLabel}
          </span>
        </label>
        {fieldErrors.termsConsent ? (
          <span id="gift-terms-consent-error" className="font-body text-xs text-j-rose">
            {fieldErrors.termsConsent}
          </span>
        ) : null}
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
