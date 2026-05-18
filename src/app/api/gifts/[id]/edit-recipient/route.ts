import { NextResponse } from "next/server";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { editGiftRecipient } from "@/lib/booking/submissions";
import { scheduleGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";
import { validateGiftRecipientFields } from "../_lib/validateGiftRecipientFields";

type EditBody = {
  recipientEmail?: string;
  recipientName?: string;
  giftSendAt?: string | null;
};

function parseBody(value: unknown): EditBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const out: EditBody = {};
  if (v.recipientEmail !== undefined) {
    if (typeof v.recipientEmail !== "string") return null;
    out.recipientEmail = v.recipientEmail;
  }
  if (v.recipientName !== undefined) {
    if (typeof v.recipientName !== "string") return null;
    out.recipientName = v.recipientName;
  }
  if (v.giftSendAt !== undefined) {
    if (v.giftSendAt !== null && typeof v.giftSendAt !== "string") return null;
    out.giftSendAt = v.giftSendAt;
  }
  return out;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const auth = await authorizeGiftPurchaser(id);
  if (!auth.ok) return auth.response;
  const { submission } = auth;

  if (submission.giftClaimedAt || submission.giftCancelledAt) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }
  // For scheduled gifts, once the claim email has fired the recipient may have
  // already opened it; edits would be confusing. self_send gifts can be edited
  // anytime before claim — the purchaser controls when they share the link.
  if (
    submission.giftDeliveryMethod === GIFT_DELIVERY.scheduled &&
    submission.giftClaimEmailFiredAt
  ) {
    return NextResponse.json({ error: "Already sent" }, { status: 409 });
  }

  const raw = await request.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { errors, cleaned } = validateGiftRecipientFields(body, submission.email, new Date());
  if (errors.length > 0) {
    return NextResponse.json({ error: "Invalid", fieldErrors: errors }, { status: 422 });
  }
  if (
    cleaned.recipientEmail === undefined &&
    cleaned.recipientName === undefined &&
    cleaned.giftSendAt === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const result = await editGiftRecipient(id, cleaned, submission);
  if (!result.updated) {
    // WHERE-guard rejected the write — concurrent state transition.
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  if (
    cleaned.giftSendAt !== undefined &&
    cleaned.giftSendAt !== null &&
    submission.giftDeliveryMethod === GIFT_DELIVERY.scheduled
  ) {
    await scheduleGiftAlarm({
      submissionId: id,
      fireAtMs: Date.parse(cleaned.giftSendAt),
    });
  }

  return NextResponse.json({ updated: true });
}
