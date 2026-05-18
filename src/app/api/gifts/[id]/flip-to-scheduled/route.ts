import { NextResponse } from "next/server";

import { GIFT_DELIVERY, MAX_EMAIL_CHARS } from "@/lib/booking/constants";
import { ownEmailKey } from "@/lib/booking/emailNormalize";
import { formatAmountPaid } from "@/lib/booking/formatAmount";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import {
  appendEmailFired,
  flipGiftToScheduled,
} from "@/lib/booking/submissions";
import { scheduleGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";
import { sendGiftPurchaseConfirmation } from "@/lib/resend";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_AT_MAX_DAYS = 365;
const MIN_SEND_AT_OFFSET_MS = 5 * 60 * 1000;

type FieldError = { field: string; message: string };

type FlipBody = { recipientEmail: string; giftSendAt: string };

function parseBody(value: unknown): FlipBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.recipientEmail !== "string" || typeof v.giftSendAt !== "string") return null;
  return { recipientEmail: v.recipientEmail, giftSendAt: v.giftSendAt };
}

function validate(
  body: FlipBody,
  purchaserEmail: string,
  now: Date,
): { errors: FieldError[]; cleaned?: { recipientEmail: string; giftSendAt: string } } {
  const errors: FieldError[] = [];
  const trimmedEmail = body.recipientEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmedEmail)) {
    errors.push({ field: "recipientEmail", message: "Enter a valid recipient email address." });
  } else if (trimmedEmail.length > MAX_EMAIL_CHARS) {
    errors.push({
      field: "recipientEmail",
      message: `Email must be ${MAX_EMAIL_CHARS} characters or fewer.`,
    });
  } else if (ownEmailKey(trimmedEmail) === ownEmailKey(purchaserEmail)) {
    errors.push({ field: "recipientEmail", message: "The recipient email can’t be your own." });
  }

  const sendAt = new Date(body.giftSendAt);
  let sendAtIso = "";
  if (Number.isNaN(sendAt.getTime())) {
    errors.push({ field: "giftSendAt", message: "Invalid date." });
  } else {
    const minAt = now.getTime() + MIN_SEND_AT_OFFSET_MS;
    const maxAt = new Date(now);
    maxAt.setUTCDate(maxAt.getUTCDate() + SEND_AT_MAX_DAYS);
    if (sendAt.getTime() < minAt) {
      errors.push({
        field: "giftSendAt",
        message: "Send-at must be at least five minutes from now.",
      });
    } else if (sendAt.getTime() > maxAt.getTime()) {
      errors.push({
        field: "giftSendAt",
        message: `Send-at must be within ${SEND_AT_MAX_DAYS} days.`,
      });
    } else {
      sendAtIso = sendAt.toISOString();
    }
  }

  if (errors.length > 0) return { errors };
  return { errors, cleaned: { recipientEmail: trimmedEmail, giftSendAt: sendAtIso } };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const auth = await authorizeGiftPurchaser(id);
  if (!auth.ok) return auth.response;
  const { submission } = auth;

  if (submission.giftDeliveryMethod !== GIFT_DELIVERY.selfSend) {
    return NextResponse.json({ error: "Already scheduled" }, { status: 409 });
  }
  if (submission.giftClaimedAt || submission.giftCancelledAt) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  const raw = await request.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { errors, cleaned } = validate(body, submission.email, new Date());
  if (errors.length > 0 || !cleaned) {
    return NextResponse.json({ error: "Invalid", fieldErrors: errors }, { status: 422 });
  }

  // Invalidate any URL the purchaser already shared by overwriting the token
  // hash with a non-redeemable sentinel. The GiftClaimScheduler DO alarm mints
  // a fresh token and re-hashes when it fires at gift_send_at, so this row's
  // hash never needs to be a real claim token between now and then.
  const provisionalTokenHash = `prov:flip-to-scheduled:${id}:${Date.now()}`;
  const flipped = await flipGiftToScheduled(id, {
    recipientEmail: cleaned.recipientEmail,
    giftSendAt: cleaned.giftSendAt,
    tokenHash: provisionalTokenHash,
  });
  if (!flipped) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  await scheduleGiftAlarm({
    submissionId: id,
    fireAtMs: Date.parse(cleaned.giftSendAt),
  });

  const nowIso = new Date().toISOString();
  const send = await sendGiftPurchaseConfirmation({
    submissionId: id,
    purchaserEmail: submission.email,
    purchaserFirstName: purchaserFirstNameFor(submission),
    readingName: submission.reading?.name ?? "your reading",
    readingPriceDisplay: submission.reading?.priceDisplay ?? "",
    amountPaidDisplay: formatAmountPaid(submission.amountPaidCents, submission.amountPaidCurrency),
    recipientName: recipientNameFor(submission),
    giftMessage: submission.giftMessage,
    variant: GIFT_DELIVERY.scheduled,
    sendAtDisplay: cleaned.giftSendAt,
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
