import { NextResponse } from "next/server";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { formatAmountPaid } from "@/lib/booking/formatAmount";
import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import {
  appendEmailFired,
  flipGiftToSelfSend,
  markGiftClaimSent,
} from "@/lib/booking/submissions";
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

  if (submission.giftDeliveryMethod !== GIFT_DELIVERY.scheduled) {
    return NextResponse.json({ error: "Already self-send" }, { status: 409 });
  }
  if (submission.giftClaimEmailFiredAt) {
    return NextResponse.json({ error: "Already sent" }, { status: 409 });
  }
  if (submission.giftClaimedAt || submission.giftCancelledAt) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  // Phase 5 Session 4b — B6.21 atomic-flip-first redesign.
  // ORDER (load-bearing — closes the cancel-vs-alarm race):
  //   1. ATOMIC FLIP of `gift_delivery_method` to self_send + provisional
  //      token hash, gated by the same NULL fired-at/claimed-at/cancelled-at
  //      predicate. 0 rows affected → 409 (someone else got there first:
  //      alarm fired, concurrent cancel-auto-send, etc).
  //   2. Cancel the DO alarm. Idempotent — if the alarm has already fired,
  //      its dispatcher will short-circuit on the now-flipped row state
  //      (`giftClaimDispatch` returns stop when delivery_method !==
  //      "scheduled").
  //   3. Issue the REAL token.
  //   4. Send the purchaser confirmation email.
  //   5. Patch the token hash with the real one.
  //
  // Why flip-first works: by step 1, no other party can transition this
  // row; the dispatcher will see the flipped state and stop. A Resend
  // failure at step 4 leaves the row in self_send mode with a provisional
  // token — the purchaser retries via /api/gifts/:id/resend-link which
  // regenerates cleanly.
  const provisionalTokenHash = `prov:${id}:${Date.now()}`;
  const nowIso = new Date().toISOString();
  const flipped = await flipGiftToSelfSend(id, {
    tokenHash: provisionalTokenHash,
    firedAtIso: nowIso,
  });
  if (!flipped) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  // Idempotent cancel — safe even if the alarm has already fired.
  await cancelGiftAlarm(id);

  const { tokenHash, claimUrl } = await issueGiftClaimToken();

  const send = await sendGiftPurchaseConfirmation({
    submissionId: id,
    purchaserEmail: submission.email,
    purchaserFirstName: purchaserFirstNameFor(submission),
    readingName: submission.reading?.name ?? "your reading",
    readingPriceDisplay: submission.reading?.priceDisplay ?? "",
    amountPaidDisplay: formatAmountPaid(submission.amountPaidCents, submission.amountPaidCurrency),
    recipientName: recipientNameFor(submission),
    giftMessage: submission.giftMessage,
    variant: GIFT_DELIVERY.selfSend,
    claimUrl,
  });
  if (send.kind !== "sent") {
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }

  await markGiftClaimSent(id, tokenHash, nowIso);

  await appendEmailFired(id, {
    type: "gift_purchase_confirmation",
    sentAt: nowIso,
    resendId: send.resendId,
  });

  return NextResponse.json({ updated: true, claimUrl });
}
