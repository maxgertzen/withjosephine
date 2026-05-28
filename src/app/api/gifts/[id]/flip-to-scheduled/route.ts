import { NextResponse } from "next/server";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { formatAmountPaid } from "@/lib/booking/formatAmount";
import { formatSendAt } from "@/lib/booking/formatSendAt";
import { provisionalTokenHash } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import { priceDisplayFor } from "@/lib/booking/priceDisplayFor";
import { isIanaTimeZone } from "@/lib/booking/scheduling/timezone";
import {
  appendEmailFired,
  flipGiftToScheduled,
} from "@/lib/booking/submissions";
import { scheduleGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";
import { sendGiftPurchaseConfirmation } from "@/lib/resend";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";
import { giftMutationGate } from "../_lib/giftMutationGate";
import { validateGiftRecipientFields } from "../_lib/validateGiftRecipientFields";

type FlipBody = { recipientEmail: string; giftSendAt: string; purchaserTimeZone: string };

function parseBody(value: unknown): FlipBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.recipientEmail !== "string" ||
    typeof v.giftSendAt !== "string" ||
    typeof v.purchaserTimeZone !== "string"
  ) {
    return null;
  }
  return {
    recipientEmail: v.recipientEmail,
    giftSendAt: v.giftSendAt,
    purchaserTimeZone: v.purchaserTimeZone,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const auth = await authorizeGiftPurchaser(id);
  if (!auth.ok) return auth.response;
  const { submission } = auth;

  // Inverse method check: flip-to-scheduled REQUIRES self_send, the others
  // require scheduled. Also opt out of alarm/sentNow checks — in self_send
  // mode neither column is meaningful for this transition.
  const gated = giftMutationGate(submission, {
    requireMethod: "selfSend",
    checkAlarmFired: false,
    checkSentNow: false,
  });
  if (gated) return gated;

  const raw = await request.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  if (!isIanaTimeZone(body.purchaserTimeZone)) {
    return NextResponse.json(
      { error: "Invalid", fieldErrors: [{ field: "purchaserTimeZone", message: "Invalid time zone." }] },
      { status: 422 },
    );
  }
  const purchasedAt = new Date(submission.paidAt ?? submission.createdAt);
  const { errors, cleaned } = validateGiftRecipientFields(body, {
    purchaserEmail: submission.email,
    now: new Date(),
    purchasedAt,
  });
  if (errors.length > 0 || !cleaned.recipientEmail || !cleaned.giftSendAt) {
    const required: typeof errors = [];
    if (!cleaned.recipientEmail && !errors.some((e) => e.field === "recipientEmail")) {
      required.push({ field: "recipientEmail", message: "Recipient email is required." });
    }
    if (!cleaned.giftSendAt && !errors.some((e) => e.field === "giftSendAt")) {
      required.push({ field: "giftSendAt", message: "Send-at is required." });
    }
    return NextResponse.json(
      { error: "Invalid", fieldErrors: [...errors, ...required] },
      { status: 422 },
    );
  }

  const flipped = await flipGiftToScheduled(id, {
    recipientEmail: cleaned.recipientEmail,
    giftSendAt: cleaned.giftSendAt,
    tokenHash: provisionalTokenHash("flip-to-scheduled", id),
  });
  if (!flipped) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  const scheduled = await scheduleGiftAlarm({
    submissionId: id,
    fireAtMs: Date.parse(cleaned.giftSendAt),
  });
  if (!scheduled) {
    // D1 row is now in `scheduled` state with no DO alarm registered. The
    // purchaser confirmation email is about to mention a send time that will
    // never fire. Surface as 502 so the form can re-try (the flip is already
    // applied; a second flip with the same args is idempotent at the SQL
    // gate via `gift_delivery_method = 'self_send'` — but a retry with the
    // current state will return 409 "Already scheduled". The recovery path
    // is operational: cancel + re-purchase, or repair the binding.
    console.error(
      `[flip-to-scheduled] scheduleGiftAlarm returned false for ${id} — DO binding missing or DO unreachable`,
    );
    return NextResponse.json(
      { error: "Could not schedule the gift. Try again in a moment, or contact us if it persists." },
      { status: 502 },
    );
  }

  const nowIso = new Date().toISOString();
  const send = await sendGiftPurchaseConfirmation({
    submissionId: id,
    purchaserEmail: submission.email,
    purchaserFirstName: purchaserFirstNameFor(submission),
    readingName: submission.reading?.name ?? "your reading",
    readingPriceDisplay: priceDisplayFor(submission),
    amountPaidDisplay: formatAmountPaid(submission.amountPaidCents, submission.amountPaidCurrency),
    recipientName: recipientNameFor(submission),
    giftMessage: submission.giftMessage,
    variant: GIFT_DELIVERY.scheduled,
    sendAtDisplay: formatSendAt(cleaned.giftSendAt, body.purchaserTimeZone),
  });
  if (send.kind === "sent") {
    await appendEmailFired(id, {
      type: "gift_purchase_confirmation",
      sentAt: nowIso,
      resendId: send.resendId,
    });
  }

  return NextResponse.json({ updated: true });
}
