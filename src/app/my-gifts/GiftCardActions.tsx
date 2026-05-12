"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { InlineError } from "@/components/Form/InlineError";
import { Input } from "@/components/Form/Input";
import type { MyGiftsPageContent } from "@/data/defaults";
import type { GiftStatus } from "@/lib/booking/giftStatus";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { useMutationAction } from "@/lib/hooks/useMutationAction";

/**
 * Phase 5 Session 4b — B6.22. Narrow view-model for the client-side action
 * controls. Only the fields the buttons actually need; intentionally NOT
 * `SubmissionRecord` so we never accidentally serialize purchaser email,
 * financial fields, or any other server-side PII to the browser bundle.
 */
export type GiftCardData = {
  _id: string;
  responses: SubmissionRecord["responses"];
  recipientEmail: string | null;
  giftSendAt: string | null;
};

/** Client-side action controls for a single GiftCard on /my-gifts. */
type Props = {
  gift: GiftCardData;
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

function editRecipientErrorLabel(code: string | null): string | null {
  if (!code) return null;
  if (code === "network") return "Network problem. Please try again.";
  if (code === "http_409") return "This gift can’t be edited anymore.";
  return "Couldn’t save those changes. Please try again.";
}

function EditRecipientControl({
  gift,
  copy,
}: {
  gift: GiftCardData;
  copy: MyGiftsPageContent;
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
  const [unchangedError, setUnchangedError] = useState<string | null>(null);

  const action = useMutationAction(`/api/gifts/${gift._id}/edit-recipient`);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnchangedError(null);
    const body: Record<string, unknown> = {};
    if (recipientName.trim() !== initialName) body.recipientName = recipientName.trim();
    if (recipientEmail.trim() !== initialEmail) body.recipientEmail = recipientEmail.trim();
    if (giftSendAt !== initialSendAt) {
      body.giftSendAt = giftSendAt ? new Date(giftSendAt).toISOString() : null;
    }
    if (Object.keys(body).length === 0) {
      setUnchangedError("Change something before saving.");
      return;
    }
    const result = await action.run(body);
    if (result.ok) {
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
  const headingId = `gift-${gift._id}-edit-heading`;
  const topError = unchangedError ?? editRecipientErrorLabel(action.topError);
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
        error={action.fieldErrors.recipientName}
        autoComplete="off"
      />
      <Input
        id={`gift-${gift._id}-recipient-email`}
        name="recipientEmail"
        type="email"
        label="Recipient email"
        value={recipientEmail}
        onChange={setRecipientEmail}
        error={action.fieldErrors.recipientEmail}
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
            action.fieldErrors.giftSendAt ? `${sendAtInputId}-error` : undefined
          }
          aria-invalid={Boolean(action.fieldErrors.giftSendAt)}
          className="rounded-sm border border-j-border-blush bg-j-ivory px-2 py-1.5 font-body text-sm text-j-text focus:outline-none focus:border-j-accent"
        />
        {action.fieldErrors.giftSendAt ? (
          <span id={`${sendAtInputId}-error`} className="font-body text-xs text-j-rose">
            {action.fieldErrors.giftSendAt}
          </span>
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
            setUnchangedError(null);
            action.reset();
          }}
          disabled={action.submitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={action.submitting}>
          {action.submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

const ARM_RESET_MS = 5000;

function flipToSelfSendErrorLabel(code: string | null): string | null {
  if (!code) return null;
  if (code === "network") return "Network problem. Please try again.";
  return "Couldn’t switch this gift. Please try again.";
}

function FlipToSelfSendControl({
  gift,
  copy,
}: {
  gift: GiftCardData;
  copy: MyGiftsPageContent;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const action = useMutationAction(`/api/gifts/${gift._id}/cancel-auto-send`);

  useEffect(() => {
    if (!armed || action.submitting) return;
    const t = setTimeout(() => setArmed(false), ARM_RESET_MS);
    return () => clearTimeout(t);
  }, [armed, action.submitting]);

  async function onConfirm() {
    const result = await action.run();
    if (result.ok) {
      router.refresh();
    } else {
      setArmed(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 items-stretch sm:items-end">
      {armed ? (
        <Button variant="primary" size="sm" disabled={action.submitting} onClick={onConfirm}>
          {action.submitting ? "Switching…" : "Tap again to confirm"}
        </Button>
      ) : (
        <Button variant="outlined" size="sm" onClick={() => setArmed(true)}>
          {copy.flipToSelfSendCtaLabel}
        </Button>
      )}
      <InlineError message={flipToSelfSendErrorLabel(action.topError)} />
    </div>
  );
}

function resendErrorLabel(code: string | null): string | null {
  if (!code) return null;
  if (code === "rate_limited")
    return "You’ve already resent this recently. Try again in a little while.";
  if (code === "network") return "Network problem. Please try again.";
  return "Couldn’t resend the link. Please try again.";
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

  async function onClick() {
    const result = await action.run();
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-1 items-stretch sm:items-end">
      <Button variant="outlined" size="sm" disabled={action.submitting} onClick={onClick}>
        {action.submitting ? "Sending…" : copy.resendLinkCtaLabel}
      </Button>
      <InlineError message={resendErrorLabel(action.topError)} />
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
