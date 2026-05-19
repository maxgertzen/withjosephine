import { NextResponse } from "next/server";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import { appendEmailFired, applyGiftSendNow } from "@/lib/booking/submissions";
import { cancelGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";
import { sendGiftClaimEmail } from "@/lib/resend";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const auth = await authorizeGiftPurchaser(id);
  if (!auth.ok) return auth.response;
  const { submission } = auth;

  if (submission.giftDeliveryMethod !== GIFT_DELIVERY.scheduled) {
    return NextResponse.json({ error: "Not scheduled" }, { status: 409 });
  }
  if (submission.giftClaimEmailFiredAt) {
    return NextResponse.json({ error: "Email already sent by alarm" }, { status: 409 });
  }
  if (submission.giftCancelledAt || submission.giftClaimedAt) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }
  if (submission.giftClaimSentNowAt) {
    return NextResponse.json({ error: "Already sent via send-now" }, { status: 409 });
  }

  const recipientEmail = submission.recipientEmail;
  if (!recipientEmail) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const [{ tokenHash, claimUrl }] = await Promise.all([
    issueGiftClaimToken(),
    cancelGiftAlarm(id),
  ]);

  const updated = await applyGiftSendNow(id, {
    tokenHash,
    sentNowAtIso: nowIso,
    actor: submission.email,
    priorAlarmAt: submission.giftSendAt,
  });
  if (!updated) {
    return NextResponse.json({ error: "Already sent or cancelled" }, { status: 409 });
  }

  const send = await sendGiftClaimEmail({
    submissionId: id,
    recipientEmail,
    recipientName: recipientNameFor(submission),
    purchaserFirstName: purchaserFirstNameFor(submission),
    readingName: submission.reading?.name ?? "your reading",
    giftMessage: submission.giftMessage,
    variant: "first_send",
    claimUrl,
    idempotencyKey: `gift:${id}:claim`,
  });
  if (send.kind !== "sent") {
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }

  await appendEmailFired(id, {
    type: "gift_claim",
    sentAt: nowIso,
    resendId: send.resendId,
  });

  return NextResponse.json({ updated: true });
}
