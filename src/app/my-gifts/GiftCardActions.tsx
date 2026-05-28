"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { InlineError } from "@/components/Form/InlineError";
import { Input } from "@/components/Form/Input";
import { TimezoneFallbackPicker } from "@/components/Form/TimezoneFallbackPicker";
import { TimezonePreview } from "@/components/Form/TimezonePreview";
import { StepUpOtpModal } from "@/components/StepUpOtpModal";
import type { MyGiftsPageContent } from "@/data/defaults";
import { GIFT_STATUS_KIND } from "@/lib/booking/constants";
import type { GiftStatus } from "@/lib/booking/giftStatus";
import { localInputToUtcIso } from "@/lib/booking/scheduling/timezone";
import { useEffectiveTimeZone } from "@/lib/booking/scheduling/useEffectiveTimeZone";
import { errorClassesSmall, invalidBorderClasses } from "@/lib/formStyles";
import { useMutationAction } from "@/lib/hooks/useMutationAction";
import type { SubmissionRecord } from "@/lib/page-previews/types";

import { actionErrorLabel } from "./actionErrorLabel";
import { ConfirmArmedButton } from "./ConfirmArmedButton";

/**
 * Narrow view-model for the client-side action controls. Only the fields
 * the buttons actually need; intentionally NOT `SubmissionRecord` so we
 * never accidentally serialize purchaser email, financial fields, or any
 * other server-side PII to the browser bundle.
 */
export type GiftCardData = {
  _id: string;
  responses: SubmissionRecord["responses"];
  recipientEmail: string | null;
  giftSendAt: string | null;
  /**
   * Pre-computed rate-limit verdict for the resend-link control. Lives here
   * rather than on `emailsFired` so the client bundle never sees raw email-
   * fired entries (which carry Resend message IDs + recipient hints).
   */
  resendVerdict?: ResendVerdictSummary;
};

export type ResendVerdictSummary = {
  allowed: boolean;
  reason?: "hour_cap" | "day_cap";
  nextAvailableAt?: string;
};

type Props = {
  gift: GiftCardData;
  status: GiftStatus;
  copy: MyGiftsPageContent;
};

export function GiftCardActions({ gift, status, copy }: Props) {
  if (status.kind === GIFT_STATUS_KIND.scheduled) {
    return (
      <div className="flex flex-col gap-3 items-stretch sm:items-end">
        <EditRecipientControl gift={gift} copy={copy} mode="scheduled" />
        <SendNowControl gift={gift} copy={copy} />
        <FlipToSelfSendControl gift={gift} copy={copy} />
      </div>
    );
  }
  if (status.kind === GIFT_STATUS_KIND.selfSendReady) {
    return (
      <div className="flex flex-col gap-3 items-stretch sm:items-end">
        <ResendLinkControl gift={gift} copy={copy} />
        <EditRecipientControl gift={gift} copy={copy} mode="self_send" />
        <FlipToScheduledControl gift={gift} copy={copy} />
      </div>
    );
  }
  return null;
}

function EditRecipientControl({
  gift,
  copy,
  mode,
}: {
  gift: GiftCardData;
  copy: MyGiftsPageContent;
  mode: "scheduled" | "self_send";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initialName =
    gift.responses.find((r) => r.fieldKey === "recipient_name")?.value ?? "";
  const initialEmail = gift.recipientEmail ?? "";
  const initialSendAt = gift.giftSendAt ? toDatetimeLocalValue(gift.giftSendAt) : "";

  const [recipientName, setRecipientName] = useState(initialName);
  const [recipientEmail, setRecipientEmail] = useState(initialEmail);
  const [giftSendAt, setGiftSendAt] = useState(initialSendAt);
  const [formError, setFormError] = useState<string | null>(null);
  const { pickedTz, setPickedTz, effectiveTz, requiresPicker } = useEffectiveTimeZone();

  const action = useMutationAction(`/api/gifts/${gift._id}/edit-recipient`);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const body: Record<string, unknown> = {};
    if (recipientName.trim() !== initialName) body.recipientName = recipientName.trim();
    if (recipientEmail.trim() !== initialEmail) body.recipientEmail = recipientEmail.trim();
    if (mode === "scheduled" && giftSendAt !== initialSendAt) {
      if (giftSendAt === "") {
        body.giftSendAt = null;
      } else {
        const conversion = localInputToUtcIso(giftSendAt, effectiveTz);
        if (!conversion.ok) {
          setFormError(copy.editRecipientTimezoneFallbackHelp);
          return;
        }
        body.giftSendAt = conversion.utcIso;
      }
    }
    if (Object.keys(body).length === 0) {
      setFormError("Change something before saving.");
      return;
    }
    const result = await action.run(body);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  async function onElevated() {
    const result = await action.retry();
    if (result && result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button variant="outlined" size="sm" onClick={() => setOpen(true)}>
        {copy.editRecipientCtaLabel}
      </Button>
    );
  }

  const sendAtInputId = `gift-${gift._id}-send-at`;
  const tzPickerId = `gift-${gift._id}-send-at-tz`;
  const headingId = `gift-${gift._id}-edit-heading`;
  const topError =
    formError ?? actionErrorLabel(action.topError, copy, { http_409: "actionClosedError" });
  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby={headingId}
      className="w-full sm:w-80 flex flex-col gap-3 bg-j-cream/60 border border-j-blush rounded-lg p-4"
    >
      <h3
        id={headingId}
        className="font-display italic text-base text-j-text-heading"
      >
        {copy.editRecipientFormTitle}
      </h3>
      {mode === "self_send" && (
        <p
          className="font-body text-xs text-j-text-muted tracking-[0.06em] inline-flex items-center gap-1.5"
          aria-label="Self-send delivery"
        >
          <span aria-hidden="true" className="text-j-accent">✓</span>
          <span>{copy.editRecipientSelfSendIndicator}</span>
        </p>
      )}
      <Input
        id={`gift-${gift._id}-recipient-name`}
        name="recipientName"
        type="text"
        label={copy.editRecipientFormRecipientNameLabel}
        value={recipientName}
        onChange={setRecipientName}
        error={action.fieldErrors.recipientName}
        autoComplete="off"
      />
      <Input
        id={`gift-${gift._id}-recipient-email`}
        name="recipientEmail"
        type="email"
        label={copy.editRecipientFormRecipientEmailLabel}
        value={recipientEmail}
        onChange={setRecipientEmail}
        error={action.fieldErrors.recipientEmail}
        autoComplete="off"
      />
      {mode === "scheduled" && (
        <label htmlFor={sendAtInputId} className="flex flex-col gap-1">
          <span className="font-body text-xs text-j-text-muted">{copy.editRecipientFormSendAtLabel}</span>
          <input
            id={sendAtInputId}
            type="datetime-local"
            value={giftSendAt}
            onChange={(e) => setGiftSendAt(e.target.value)}
            aria-describedby={
              action.fieldErrors.giftSendAt ? `${sendAtInputId}-error` : undefined
            }
            aria-invalid={Boolean(action.fieldErrors.giftSendAt)}
            className={`rounded-sm border border-j-border-blush bg-j-ivory px-2 py-1.5 font-body text-sm text-j-text focus:outline-none focus:border-j-accent ${invalidBorderClasses}`}
          />
          {action.fieldErrors.giftSendAt ? (
            <span id={`${sendAtInputId}-error`} className={errorClassesSmall}>
              {action.fieldErrors.giftSendAt}
            </span>
          ) : null}
          <TimezonePreview
            value={giftSendAt}
            template={copy.editRecipientSendAtPreviewTemplate}
            timeZone={effectiveTz}
          />
          {requiresPicker ? (
            <TimezoneFallbackPicker
              id={tzPickerId}
              value={pickedTz}
              onChange={setPickedTz}
              label={copy.editRecipientTimezoneLabel}
              placeholder={copy.editRecipientTimezonePlaceholder}
            />
          ) : null}
        </label>
      )}
      <InlineError message={topError} />
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setFormError(null);
            action.reset();
          }}
          disabled={action.submitting}
        >
          {copy.editRecipientCancelButtonLabel}
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={action.submitting}>
          {action.submitting ? copy.editRecipientSavingLabel : copy.editRecipientSaveButtonLabel}
        </Button>
      </div>
      <StepUpOtpModal
        open={action.elevationRequired !== null}
        onClose={() => action.reset()}
        onElevated={onElevated}
        contactMailto={action.elevationRequired?.contactMailto}
      />
    </form>
  );
}

function FlipToSelfSendControl({
  gift,
  copy,
}: {
  gift: GiftCardData;
  copy: MyGiftsPageContent;
}) {
  return (
    <ConfirmArmedButton
      endpoint={`/api/gifts/${gift._id}/cancel-auto-send`}
      copy={copy}
      labels={{
        idle: copy.flipToSelfSendCtaLabel,
        confirm: copy.flipConfirmCtaLabel,
        sending: copy.flipSwitchingLabel,
      }}
    />
  );
}

function SendNowControl({
  gift,
  copy,
}: {
  gift: GiftCardData;
  copy: MyGiftsPageContent;
}) {
  return (
    <ConfirmArmedButton
      endpoint={`/api/gifts/${gift._id}/send-now`}
      copy={copy}
      labels={{
        idle: copy.sendNowCtaLabel,
        confirm: copy.sendNowConfirmCtaLabel,
        sending: copy.sendNowSendingLabel,
      }}
      errorOverrides={{
        http_401: "sendNowSessionExpiredError",
        http_409: "actionClosedError",
      }}
    />
  );
}

function FlipToScheduledControl({
  gift,
  copy,
}: {
  gift: GiftCardData;
  copy: MyGiftsPageContent;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(gift.recipientEmail ?? "");
  const [giftSendAt, setGiftSendAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { pickedTz, setPickedTz, effectiveTz, requiresPicker } = useEffectiveTimeZone();
  const action = useMutationAction(`/api/gifts/${gift._id}/flip-to-scheduled`);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const conversion = localInputToUtcIso(giftSendAt, effectiveTz);
    if (!conversion.ok) {
      setFormError(copy.editRecipientTimezoneFallbackHelp);
      return;
    }
    const result = await action.run({
      recipientEmail: recipientEmail.trim(),
      giftSendAt: conversion.utcIso,
      purchaserTimeZone: effectiveTz ?? "UTC",
    });
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button variant="outlined" size="sm" onClick={() => setOpen(true)}>
        {copy.flipToScheduledCtaLabel}
      </Button>
    );
  }

  const sendAtInputId = `gift-${gift._id}-flip-send-at`;
  const tzPickerId = `gift-${gift._id}-flip-send-at-tz`;
  const headingId = `gift-${gift._id}-flip-heading`;
  const topError =
    formError ?? actionErrorLabel(action.topError, copy, { http_409: "actionClosedError" });
  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby={headingId}
      className="w-full sm:w-80 flex flex-col gap-3 bg-j-cream/60 border border-j-blush rounded-lg p-4"
    >
      <h3
        id={headingId}
        className="font-display italic text-base text-j-text-heading"
      >
        {copy.flipToScheduledFormTitle}
      </h3>
      <Input
        id={`gift-${gift._id}-flip-recipient-email`}
        name="recipientEmail"
        type="email"
        label={copy.editRecipientFormRecipientEmailLabel}
        value={recipientEmail}
        onChange={setRecipientEmail}
        error={action.fieldErrors.recipientEmail}
        autoComplete="off"
      />
      <label htmlFor={sendAtInputId} className="flex flex-col gap-1">
        <span className="font-body text-xs text-j-text-muted">
          {copy.editRecipientFormSendAtLabel}
        </span>
        <input
          id={sendAtInputId}
          type="datetime-local"
          value={giftSendAt}
          onChange={(e) => setGiftSendAt(e.target.value)}
          aria-describedby={
            action.fieldErrors.giftSendAt ? `${sendAtInputId}-error` : undefined
          }
          aria-invalid={Boolean(action.fieldErrors.giftSendAt)}
          className={`rounded-sm border border-j-border-blush bg-j-ivory px-2 py-1.5 font-body text-sm text-j-text focus:outline-none focus:border-j-accent ${invalidBorderClasses}`}
        />
        {action.fieldErrors.giftSendAt ? (
          <span id={`${sendAtInputId}-error`} className={errorClassesSmall}>
            {action.fieldErrors.giftSendAt}
          </span>
        ) : null}
        <TimezonePreview
          value={giftSendAt}
          template={copy.editRecipientSendAtPreviewTemplate}
          timeZone={effectiveTz}
        />
        {requiresPicker ? (
          <TimezoneFallbackPicker
            id={tzPickerId}
            value={pickedTz}
            onChange={setPickedTz}
            label={copy.editRecipientTimezoneLabel}
            placeholder={copy.editRecipientTimezonePlaceholder}
          />
        ) : null}
      </label>
      <InlineError message={topError} />
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            action.reset();
          }}
          disabled={action.submitting}
        >
          {copy.editRecipientCancelButtonLabel}
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={action.submitting}>
          {action.submitting
            ? copy.flipToScheduledSavingLabel
            : copy.flipToScheduledSaveButtonLabel}
        </Button>
      </div>
    </form>
  );
}

function formatNextAvailable(iso: string, fallback: string): string {
  const next = new Date(iso);
  if (Number.isNaN(next.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(next);
}

function rateLimitMessageFor(
  verdict: ResendVerdictSummary | undefined,
  copy: MyGiftsPageContent,
): string | null {
  if (!verdict || verdict.allowed) return null;
  const fallback = copy.resendRetryFallbackLabel;
  const when = verdict.nextAvailableAt
    ? formatNextAvailable(verdict.nextAvailableAt, fallback)
    : fallback;
  const template =
    verdict.reason === "hour_cap"
      ? copy.resendRetryAfterHourTemplate
      : copy.resendRetryAfterDayTemplate;
  return template.replace(/\{when\}/g, when);
}

function ResendLinkControl({
  gift,
  copy,
}: {
  gift: GiftCardData;
  copy: MyGiftsPageContent;
}) {
  const router = useRouter();
  const action = useMutationAction(`/api/gifts/${gift._id}/resend-link`);
  const verdict = gift.resendVerdict;
  const blocked = Boolean(verdict && !verdict.allowed);
  const blockedMessage = rateLimitMessageFor(verdict, copy);

  async function onClick() {
    const result = await action.run();
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-1 items-stretch sm:items-end">
      <Button
        variant="outlined"
        size="sm"
        disabled={action.submitting || blocked}
        onClick={onClick}
      >
        {action.submitting ? copy.resendSendingLabel : copy.resendLinkCtaLabel}
      </Button>
      {blockedMessage ? (
        <p className="font-body text-xs text-j-text-muted italic">{blockedMessage}</p>
      ) : null}
      <InlineError
        message={actionErrorLabel(action.topError, copy, {
          rate_limited: "resendThrottledMessage",
        })}
      />
    </div>
  );
}

/**
 * Convert an ISO timestamp to the `YYYY-MM-DDTHH:mm` format `datetime-local`
 * inputs expect.
 *
 * - **Timezone display:** uses `Date#getFullYear/Month/Date/Hours/Minutes` so
 *   the picker shows the time in the user's LOCAL timezone (intentional UX —
 *   the recipient's gift will arrive at what the purchaser thinks "8pm
 *   Thursday" means in their own zone). We round-trip back to UTC ISO on
 *   submit so D1 stores TZ-correct.
 * - **Seconds truncation:** the picker's value has minute granularity only.
 *   We truncate to `HH:mm`; the server treats `gift_send_at` as
 *   minute-precision throughout, so this is lossy by design.
 */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
