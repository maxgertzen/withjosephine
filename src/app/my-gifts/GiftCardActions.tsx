"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Form/Input";
import type { MyGiftsPageContent } from "@/data/defaults";
import type { GiftStatus } from "@/lib/booking/giftStatus";
import type { SubmissionRecord } from "@/lib/booking/submissions";

/** Client-side action controls for a single GiftCard on /my-gifts. */
type Props = {
  gift: SubmissionRecord;
  status: GiftStatus;
  copy: MyGiftsPageContent;
};

export function GiftCardActions({ gift, status, copy }: Props) {
  if (status.kind === "scheduled") {
    return (
      <div className="flex flex-col gap-3 items-stretch sm:items-end">
        <EditRecipientControl gift={gift} copy={copy} />
        <FlipToSelfSendControl gift={gift} copy={copy} />
      </div>
    );
  }
  if (status.kind === "self_send_ready") {
    return <ResendLinkControl gift={gift} copy={copy} />;
  }
  return null;
}

function EditRecipientControl({
  gift,
  copy,
}: {
  gift: SubmissionRecord;
  copy: MyGiftsPageContent;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const initialName =
    gift.responses.find((r) => r.fieldKey === "recipient_name")?.value ?? "";
  const initialEmail = gift.recipientEmail ?? "";
  const initialSendAt = gift.giftSendAt ? toDatetimeLocalValue(gift.giftSendAt) : "";

  const [recipientName, setRecipientName] = useState(initialName);
  const [recipientEmail, setRecipientEmail] = useState(initialEmail);
  const [giftSendAt, setGiftSendAt] = useState(initialSendAt);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setTopError(null);
    const body: Record<string, unknown> = {};
    if (recipientName.trim() !== initialName) body.recipientName = recipientName.trim();
    if (recipientEmail.trim() !== initialEmail) body.recipientEmail = recipientEmail.trim();
    if (giftSendAt !== initialSendAt) {
      body.giftSendAt = giftSendAt ? new Date(giftSendAt).toISOString() : null;
    }
    if (Object.keys(body).length === 0) {
      setTopError("Change something before saving.");
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch(`/api/gifts/${gift._id}/edit-recipient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 422) {
        const json = (await res.json()) as { fieldErrors?: Array<{ field: string; message: string }> };
        const errs: Record<string, string> = {};
        for (const e of json.fieldErrors ?? []) errs[e.field] = e.message;
        setFieldErrors(errs);
        return;
      }
      if (res.status === 409) {
        setTopError("This gift can’t be edited anymore.");
        return;
      }
      if (!res.ok) {
        setTopError("Couldn’t save those changes. Please try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setTopError("Network problem. Please try again.");
    } finally {
      setSubmitting(false);
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
  const headingId = `gift-${gift._id}-edit-heading`;
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
        Edit recipient
      </h3>
      <Input
        id={`gift-${gift._id}-recipient-name`}
        name="recipientName"
        type="text"
        label="Recipient name"
        value={recipientName}
        onChange={setRecipientName}
        error={fieldErrors.recipientName}
        autoComplete="off"
      />
      <Input
        id={`gift-${gift._id}-recipient-email`}
        name="recipientEmail"
        type="email"
        label="Recipient email"
        value={recipientEmail}
        onChange={setRecipientEmail}
        error={fieldErrors.recipientEmail}
        autoComplete="off"
      />
      <label htmlFor={sendAtInputId} className="flex flex-col gap-1">
        <span className="font-body text-xs text-j-text-muted">Send at</span>
        <input
          id={sendAtInputId}
          type="datetime-local"
          value={giftSendAt}
          onChange={(e) => setGiftSendAt(e.target.value)}
          aria-describedby={
            fieldErrors.giftSendAt ? `${sendAtInputId}-error` : undefined
          }
          aria-invalid={Boolean(fieldErrors.giftSendAt)}
          className="rounded-sm border border-j-border-blush bg-j-ivory px-2 py-1.5 font-body text-sm text-j-text focus:outline-none focus:border-j-accent"
        />
        {fieldErrors.giftSendAt ? (
          <span id={`${sendAtInputId}-error`} className="font-body text-xs text-j-rose">
            {fieldErrors.giftSendAt}
          </span>
        ) : null}
      </label>
      {topError ? (
        <p role="alert" className="font-body text-xs text-j-rose">
          {topError}
        </p>
      ) : null}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setFieldErrors({});
            setTopError(null);
          }}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

const ARM_RESET_MS = 5000;

function FlipToSelfSendControl({
  gift,
  copy,
}: {
  gift: SubmissionRecord;
  copy: MyGiftsPageContent;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  useEffect(() => {
    if (!armed || submitting) return;
    const t = setTimeout(() => setArmed(false), ARM_RESET_MS);
    return () => clearTimeout(t);
  }, [armed, submitting]);

  async function onConfirm() {
    setSubmitting(true);
    setTopError(null);
    try {
      const res = await fetch(`/api/gifts/${gift._id}/cancel-auto-send`, {
        method: "POST",
      });
      if (!res.ok) {
        setTopError("Couldn’t switch this gift. Please try again.");
        setArmed(false);
        return;
      }
      router.refresh();
    } catch {
      setTopError("Network problem. Please try again.");
      setArmed(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 items-stretch sm:items-end">
      {armed ? (
        <Button variant="primary" size="sm" disabled={submitting} onClick={onConfirm}>
          {submitting ? "Switching…" : "Tap again to confirm"}
        </Button>
      ) : (
        <Button variant="outlined" size="sm" onClick={() => setArmed(true)}>
          {copy.flipToSelfSendCtaLabel}
        </Button>
      )}
      {topError ? (
        <p role="alert" className="font-body text-xs text-j-rose">
          {topError}
        </p>
      ) : null}
    </div>
  );
}

function ResendLinkControl({
  gift,
  copy,
}: {
  gift: SubmissionRecord;
  copy: MyGiftsPageContent;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  async function onClick() {
    setSubmitting(true);
    setTopError(null);
    try {
      const res = await fetch(`/api/gifts/${gift._id}/resend-link`, {
        method: "POST",
      });
      if (res.status === 429) {
        setTopError("You’ve already resent this recently. Try again in a little while.");
        return;
      }
      if (!res.ok) {
        setTopError("Couldn’t resend the link. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setTopError("Network problem. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 items-stretch sm:items-end">
      <Button variant="outlined" size="sm" disabled={submitting} onClick={onClick}>
        {submitting ? "Sending…" : copy.resendLinkCtaLabel}
      </Button>
      {topError ? (
        <p role="alert" className="font-body text-xs text-j-rose">
          {topError}
        </p>
      ) : null}
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
