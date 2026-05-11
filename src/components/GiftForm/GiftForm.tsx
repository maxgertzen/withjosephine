"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { type FormEvent,useState } from "react";

import type { BookingGiftFormContent } from "@/data/defaults";
import type { ReadingId } from "@/lib/analytics";
import { track } from "@/lib/analytics";
import { BOOKING_API_GIFT_ROUTE, HONEYPOT_FIELD } from "@/lib/booking/constants";

type DeliveryMethod = "self_send" | "scheduled";
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
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("self_send");
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

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!purchaserFirstName.trim()) {
      errs.purchaserFirstName = "Your first name is required.";
    }
    if (!purchaserEmail.trim()) {
      errs.purchaserEmail = "Enter a valid email address.";
    }
    if (deliveryMethod === "scheduled") {
      if (!recipientName.trim()) errs.recipientName = "Recipient name is required.";
      if (!recipientEmail.trim()) errs.recipientEmail = "Enter a valid recipient email.";
      if (!giftSendAt) errs.giftSendAt = "Pick when the gift should arrive.";
    }
    if (!art6Consent) errs.art6Consent = "Required to proceed.";
    if (!coolingOffConsent) errs.coolingOffConsent = "Required to proceed.";
    if (!termsConsent) errs.termsConsent = "Required to proceed.";
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

    if (Object.keys(errs).length > 0) return;

    const token = turnstileBypass ? "bypass" : turnstileToken;
    if (!token) {
      setTopLevelError("Please complete the verification step and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const giftSendAtIso =
        deliveryMethod === "scheduled" && giftSendAt
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
        setTopLevelError(json.error ?? "Something went wrong. Please try again.");
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
      setTopLevelError("Network problem. Please try again.");
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
    deliveryMethod === "self_send"
      ? copy.submitButtonSelfSend
      : copy.submitButtonScheduled;

  const isScheduled = deliveryMethod === "scheduled";

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
              value="self_send"
              checked={deliveryMethod === "self_send"}
              onChange={() => setDeliveryMethod("self_send")}
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
              value="scheduled"
              checked={deliveryMethod === "scheduled"}
              onChange={() => setDeliveryMethod("scheduled")}
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
        <label className="flex flex-col gap-1.5">
          <span className="font-display italic text-base text-j-text-heading">
            {copy.purchaserFirstNameLabel}
          </span>
          <input
            type="text"
            value={purchaserFirstName}
            onChange={(e) => setPurchaserFirstName(e.target.value)}
            maxLength={80}
            className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
          />
          <span className="font-body text-xs text-j-text-muted">
            {copy.purchaserFirstNameHelper}
          </span>
          {fieldErrors.purchaserFirstName ? (
            <span className="font-body text-xs text-j-rose">
              {fieldErrors.purchaserFirstName}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display italic text-base text-j-text-heading">
            {copy.purchaserEmailLabel}
          </span>
          <input
            type="email"
            value={purchaserEmail}
            onChange={(e) => setPurchaserEmail(e.target.value)}
            autoComplete="email"
            className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
          />
          <span className="font-body text-xs text-j-text-muted">
            {copy.purchaserEmailHelper}
          </span>
          {fieldErrors.purchaserEmail ? (
            <span className="font-body text-xs text-j-rose">{fieldErrors.purchaserEmail}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display italic text-base text-j-text-heading">
            {isScheduled ? copy.recipientNameLabelScheduled : copy.recipientNameLabelSelfSend}
          </span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            maxLength={80}
            placeholder={
              isScheduled ? undefined : copy.recipientNamePlaceholderSelfSend
            }
            className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
          />
          {isScheduled ? (
            <span className="font-body text-xs text-j-text-muted">
              {copy.recipientNameHelperScheduled}
            </span>
          ) : null}
          {fieldErrors.recipientName ? (
            <span className="font-body text-xs text-j-rose">{fieldErrors.recipientName}</span>
          ) : null}
        </label>

        {isScheduled ? (
          <label className="flex flex-col gap-1.5">
            <span className="font-display italic text-base text-j-text-heading">
              {copy.recipientEmailLabel}
            </span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              autoComplete="off"
              className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
            />
            <span className="font-body text-xs text-j-text-muted">
              {copy.recipientEmailHelper}
            </span>
            {fieldErrors.recipientEmail ? (
              <span className="font-body text-xs text-j-rose">{fieldErrors.recipientEmail}</span>
            ) : null}
          </label>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="font-display italic text-base text-j-text-heading">
            {copy.giftMessageLabel}
          </span>
          <textarea
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
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-j-text-muted">
                {copy.sendAtCustomLabel}
              </span>
              <input
                type="datetime-local"
                value={giftSendAt}
                onChange={(e) => setGiftSendAt(e.target.value)}
                className="rounded-sm border border-j-border-blush bg-j-ivory px-3 py-2 font-body text-base text-j-text focus:outline-none focus:border-j-accent"
              />
              {fieldErrors.giftSendAt ? (
                <span className="font-body text-xs text-j-rose">{fieldErrors.giftSendAt}</span>
              ) : null}
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
        <label className="flex gap-3 items-start py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={art6Consent}
            onChange={(e) => setArt6Consent(e.target.checked)}
            className="mt-1 accent-j-deep"
          />
          <span className="flex-1 font-body text-sm text-j-text">
            {copy.art6ConsentLabel}
          </span>
        </label>
        {fieldErrors.art6Consent ? (
          <span className="font-body text-xs text-j-rose">{fieldErrors.art6Consent}</span>
        ) : null}
        <label className="flex gap-3 items-start py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={coolingOffConsent}
            onChange={(e) => setCoolingOffConsent(e.target.checked)}
            className="mt-1 accent-j-deep"
          />
          <span className="flex-1 font-body text-sm text-j-text">
            {copy.coolingOffConsentLabel}
          </span>
        </label>
        {fieldErrors.coolingOffConsent ? (
          <span className="font-body text-xs text-j-rose">{fieldErrors.coolingOffConsent}</span>
        ) : null}
        <label className="flex gap-3 items-start py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={termsConsent}
            onChange={(e) => setTermsConsent(e.target.checked)}
            className="mt-1 accent-j-deep"
          />
          <span className="flex-1 font-body text-sm text-j-text">
            {copy.termsConsentLabel}
          </span>
        </label>
        {fieldErrors.termsConsent ? (
          <span className="font-body text-xs text-j-rose">{fieldErrors.termsConsent}</span>
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
        {submitting ? copy.loadingStateCopy : `✦ ${submitLabel}`}
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
