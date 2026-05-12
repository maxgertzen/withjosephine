import { NextResponse } from "next/server";

import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "@/lib/booking/giftPersonas";
import { sendAndRecord } from "@/lib/booking/sendAndRecord";
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

  // Phase 5 Session 4b — B5.17 cooldown. Walk emails_fired_json for the
  // most recent `gift_claim_regenerate` entry; reject if within 5 minutes.
  // Defends Resend cost + customer-inbox spam from repeated admin clicks
  // (the admin recovery primitive is meant for "I lost my link" support
  // tickets, not a bulk retry loop).
  const COOLDOWN_MS = 5 * 60 * 1000;
  const lastRegenIso = (submission.emailsFired ?? [])
    .filter((e) => e.type === "gift_claim_regenerate")
    .map((e) => Date.parse(e.sentAt))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];
  if (lastRegenIso !== undefined && Date.now() - lastRegenIso < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Cooldown active — wait 5 minutes between regenerations" },
      { status: 429 },
    );
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
  const sendResult = await sendAndRecord({
    submissionId: submission._id,
    type: "gift_claim",
    nowIso,
    send: () =>
      sendGiftClaimEmail({
        submissionId: submission._id,
        recipientEmail: targetEmail,
        recipientName: recipientNameFor(submission),
        purchaserFirstName: purchaserFirstNameFor(submission),
        readingName: submission.reading?.name ?? "reading",
        giftMessage: submission.giftMessage ?? null,
        variant: "first_send",
        claimUrl,
      }),
  });

  if (sendResult.resendId === null) {
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
  // Phase 5 Session 4b — B5.17. Separate audit entry powers the cooldown
  // walk above without overloading the semantics of the `gift_claim`
  // entry that sendAndRecord just wrote.
  await appendEmailFired(submission._id, {
    type: "gift_claim_regenerate",
    sentAt: nowIso,
    resendId: sendResult.resendId,
  });

  return NextResponse.json({
    outcome: "regenerated",
    to: redact(targetEmail),
    deliveryMethod: submission.giftDeliveryMethod,
    resendDispatched: true,
  });
}
