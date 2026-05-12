import { NextResponse } from "next/server";

import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import {
  appendEmailFired,
  findSubmissionById,
  markGiftClaimSent,
} from "@/lib/booking/submissions";
import { sendGiftClaimEmail } from "@/lib/resend";

import { isDispatchSecretAuthorized } from "../_lib/headerSecretAuth";

function parseBody(value: unknown): { submissionId: string } | null {
  if (!value || typeof value !== "object") return null;
  const submissionId = (value as Record<string, unknown>).submissionId;
  if (typeof submissionId !== "string" || submissionId.length === 0) return null;
  return { submissionId };
}

function redact(email: string): string {
  return email.replace(/(^.)([^@]+)(?=@)/, "$1***");
}

export async function POST(request: Request): Promise<Response> {
  if (!isDispatchSecretAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const submission = await findSubmissionById(body.submissionId);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (!submission.isGift || !submission.giftDeliveryMethod) {
    return NextResponse.json({ error: "Submission is not a gift" }, { status: 409 });
  }
  if (submission.giftClaimedAt) {
    return NextResponse.json({ error: "Gift already claimed" }, { status: 409 });
  }
  if (submission.giftCancelledAt) {
    return NextResponse.json({ error: "Gift cancelled" }, { status: 409 });
  }

  // For self_send mode the purchaser is the holder of the link; for scheduled
  // the recipient is. Either way, regenerating means resending the new link
  // to the same party that should have received it.
  const targetEmail =
    submission.giftDeliveryMethod === "self_send" ? submission.email : submission.recipientEmail;
  if (!targetEmail) {
    return NextResponse.json({ error: "No target email on submission" }, { status: 409 });
  }

  const { tokenHash, claimUrl } = await issueGiftClaimToken();
  const nowIso = new Date().toISOString();

  // Send FIRST, then persist on success. Doing the persist first would brick
  // the prior valid token when Resend is unavailable (dry-run / missing key /
  // network throw): the old hash is overwritten, gift_claim_email_fired_at
  // advances, and no replacement email reaches the customer.
  const result = await sendGiftClaimEmail({
    submissionId: submission._id,
    recipientEmail: targetEmail,
    recipientName: recipientNameFor(submission),
    purchaserFirstName: purchaserFirstNameFor(submission),
    readingName: submission.reading?.name ?? "reading",
    giftMessage: submission.giftMessage ?? null,
    variant: "first_send",
    claimUrl,
  });

  if (result.resendId === null) {
    return NextResponse.json(
      {
        outcome: "send_failed",
        to: redact(targetEmail),
        deliveryMethod: submission.giftDeliveryMethod,
        resendDispatched: false,
      },
      { status: 502 },
    );
  }

  await markGiftClaimSent(submission._id, tokenHash, nowIso);
  await appendEmailFired(submission._id, {
    type: "gift_claim",
    sentAt: nowIso,
    resendId: result.resendId,
  });

  return NextResponse.json({
    outcome: "regenerated",
    to: redact(targetEmail),
    deliveryMethod: submission.giftDeliveryMethod,
    resendDispatched: true,
  });
}
