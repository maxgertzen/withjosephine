import { NextResponse } from "next/server";

import { formatAmountPaid } from "@/lib/booking/formatAmount";
import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import { giftResendRateLimit } from "@/lib/booking/giftStatus";
import { appendEmailFired, markGiftClaimSent } from "@/lib/booking/submissions";
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

  if (submission.giftDeliveryMethod !== "self_send") {
    return NextResponse.json({ error: "Not self-send" }, { status: 409 });
  }
  if (submission.giftClaimedAt) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }
  if (submission.giftCancelledAt) {
    return NextResponse.json({ error: "Cancelled" }, { status: 409 });
  }

  const verdict = giftResendRateLimit(submission.emailsFired, Date.now());
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: "Rate limited", reason: verdict.reason },
      { status: 429 },
    );
  }

  // Regenerate the token. Raw tokens aren't stored, so "resend the original"
  // is implemented as regenerate-and-resend; the prior URL is invalidated by
  // the hash overwrite. Send-first-then-persist guards the prior state on a
  // Resend transient failure.
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

  await markGiftClaimSent(id, tokenHash, nowIso);
  await appendEmailFired(id, {
    type: "gift_resend",
    sentAt: nowIso,
    resendId: send.resendId,
  });

  return NextResponse.json({ resent: true, claimUrl });
}
