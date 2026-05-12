import { NextResponse } from "next/server";

import { formatAmountPaid } from "@/lib/booking/formatAmount";
import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import { appendEmailFired, flipGiftToSelfSend } from "@/lib/booking/submissions";
import { cancelGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";
import { sendGiftPurchaseConfirmation } from "@/lib/resend";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const auth = await authorizeGiftPurchaser(id);
  if (!auth.ok) return auth.response;
  const { submission } = auth;

  if (submission.giftDeliveryMethod !== "scheduled") {
    return NextResponse.json({ error: "Already self-send" }, { status: 409 });
  }
  if (submission.giftClaimEmailFiredAt) {
    return NextResponse.json({ error: "Already sent" }, { status: 409 });
  }
  if (submission.giftClaimedAt || submission.giftCancelledAt) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  // Cancel-then-send-then-persist. Cancelling first avoids the race where
  // an imminent alarm sends a claim email to the recipient AFTER the
  // purchaser flipped to self_send: with the alarm cleared, the dispatcher
  // can't fire. The trade-off is that a Resend failure on the send step
  // leaves the alarm permanently gone — handled by the 502 response which
  // makes the purchaser retry (idempotent re-cancel + fresh attempt).
  await cancelGiftAlarm(id);

  const { tokenHash, claimUrl } = await issueGiftClaimToken();
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
    variant: "self_send",
    claimUrl,
  });
  if (send.resendId === null) {
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }

  const flipped = await flipGiftToSelfSend(id, { tokenHash, firedAtIso: nowIso });
  if (!flipped) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }
  await appendEmailFired(id, {
    type: "gift_purchase_confirmation",
    sentAt: nowIso,
    resendId: send.resendId,
  });

  return NextResponse.json({ updated: true, claimUrl });
}
