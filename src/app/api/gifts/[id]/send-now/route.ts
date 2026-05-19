import { NextResponse } from "next/server";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import { appendEmailFired, applyGiftSendNow } from "@/lib/booking/submissions";
import { cancelGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";
import { sendGiftClaimEmail } from "@/lib/resend";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";

/**
 * Send-now: purchaser on `/my-gifts` fires the recipient's claim email
 * immediately, bypassing the scheduled alarm.
 *
 * Race ordering (load-bearing, per Phase 3 Council § D-10):
 *   1. Auth via `authorizeGiftPurchaser` (session matches purchaser_user_id).
 *   2. Preflight 409s for non-scheduled / already-fired / cancelled / prior-
 *      send-now states. The prior-send-now check is the idempotency path —
 *      a second click after a successful send returns 409 cleanly.
 *   3. Issue a fresh claim token.
 *   4. Cancel the DO alarm (idempotent on the DO side — safe even if the
 *      alarm has already entered the dispatch path; the dispatcher's
 *      `giftClaimSentNowAt` defense-in-depth check short-circuits it).
 *   5. WHERE-guarded UPDATE writes the audit columns. rowcount 0 → 409
 *      (concurrent caller landed first).
 *   6. Send the claim email with `Idempotency-Key: gift:{id}:claim` so the
 *      Resend side collapses any duplicate that races in from the alarm.
 *   7. Append the email-fired entry on send success.
 */
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
  // Token issuance and alarm cancel are independent — both must precede the
  // UPDATE, but neither blocks the other. Running them in parallel saves a
  // round-trip on the critical send-now path.
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
    // Audit columns remain populated — Becky can inspect `sent_now_at` and
    // re-trigger via the resend-link path. Returning 502 surfaces the
    // failure to the purchaser so they can retry.
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }

  await appendEmailFired(id, {
    type: "gift_claim",
    sentAt: nowIso,
    resendId: send.resendId,
  });

  return NextResponse.json({ updated: true });
}
