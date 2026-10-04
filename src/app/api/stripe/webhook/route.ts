import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { serverTrack } from "@/lib/analytics/server";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import {
  findSubmissionById,
  markSubmissionExpired,
  SUBMISSION_STATUS,
} from "@/lib/booking/submissions";
import { activateGift, giftActivationFromSession } from "@/lib/gift/activateGift";
import { giftIdFromClientReferenceId } from "@/lib/gift/clientReference";
import { expireGift } from "@/lib/gift/expireGift";
import { constructWebhookEvent } from "@/lib/stripe";
import { paidFieldsFromSession, unixToIso } from "@/lib/stripeSession";

const SIGNATURE_HEADER = "stripe-signature";

async function handleCompleted(event: Stripe.CheckoutSessionCompletedEvent): Promise<void> {
  const session = event.data.object;
  const paidAt = unixToIso(event.created);
  const giftActivation = giftActivationFromSession(session, paidAt);
  if (giftActivation) {
    await activateGift(giftActivation);
    return;
  }

  const submissionId = session.client_reference_id;
  if (!submissionId) {
    console.warn(`[stripe-webhook] event ${event.id} has no client_reference_id`);
    return;
  }

  const submission = await findSubmissionById(submissionId);
  if (!submission) {
    console.warn(
      `[stripe-webhook] submission ${submissionId} not found for event ${event.id} — manual reconcile will retry`,
    );
    return;
  }

  const paid = paidFieldsFromSession(session, paidAt);
  const result = await applyPaidEvent(submission, { stripeEventId: event.id, ...paid });

  if (result === "applied") {
    void serverTrack("payment_success", {
      distinct_id: submission._id,
      submission_id: submission._id,
      reading_id: submission.reading?.slug ?? "",
      amount_paid_cents: paid.amountPaidCents,
      currency: paid.amountPaidCurrency,
      stripe_session_id: session.id,
    });
  }
}

async function handleExpired(event: Stripe.CheckoutSessionExpiredEvent): Promise<void> {
  const session = event.data.object;
  const clientReferenceId = session.client_reference_id;
  if (!clientReferenceId) return;

  const giftId = giftIdFromClientReferenceId(clientReferenceId);
  if (giftId) {
    await expireGift(giftId, unixToIso(event.created));
    return;
  }

  const submission = await findSubmissionById(clientReferenceId);
  if (!submission) {
    console.warn(
      `[stripe-webhook] submission ${clientReferenceId} not found for expired event ${event.id}`,
    );
    return;
  }
  if (submission.status !== SUBMISSION_STATUS.pending) return;

  const wasExpired = await markSubmissionExpired(submission._id, {
    stripeEventId: event.id,
    expiredAt: unixToIso(event.created),
  });
  if (!wasExpired) return;

  void serverTrack("payment_expired", {
    distinct_id: submission._id,
    submission_id: submission._id,
    reading_id: submission.reading?.slug ?? "",
    stripe_session_id: session.id,
  });
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get(SIGNATURE_HEADER);
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Stripe signature verification hashes the exact bytes received — must use raw text.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (error) {
    console.warn("[stripe-webhook] Signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCompleted(event);
      break;
    case "checkout.session.expired":
      await handleExpired(event);
      break;
  }

  return NextResponse.json({ received: true });
}
