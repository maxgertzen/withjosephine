import { NextResponse } from "next/server";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { formatAmountPaid } from "@/lib/booking/formatAmount";
import { provisionalTokenHash } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import {
  appendEmailFired,
  flipGiftToScheduled,
} from "@/lib/booking/submissions";
import { scheduleGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";
import { sendGiftPurchaseConfirmation } from "@/lib/resend";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";
import { validateGiftRecipientFields } from "../_lib/validateGiftRecipientFields";

type FlipBody = { recipientEmail: string; giftSendAt: string };

function parseBody(value: unknown): FlipBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.recipientEmail !== "string" || typeof v.giftSendAt !== "string") return null;
  return { recipientEmail: v.recipientEmail, giftSendAt: v.giftSendAt };
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
  const { errors, cleaned } = validateGiftRecipientFields(body, submission.email, new Date());
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
