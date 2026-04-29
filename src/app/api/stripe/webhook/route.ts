import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import { findSubmissionById, markSubmissionExpired } from "@/lib/booking/submissions";
import { constructWebhookEvent } from "@/lib/stripe";

const SIGNATURE_HEADER = "stripe-signature";

function unixToIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

async function handleCompleted(event: Stripe.CheckoutSessionCompletedEvent): Promise<void> {
  const session = event.data.object;
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

  await applyPaidEvent(submission, {
    stripeEventId: event.id,
    stripeSessionId: session.id,
    paidAt: unixToIso(event.created),
  });
}

async function handleExpired(event: Stripe.CheckoutSessionExpiredEvent): Promise<void> {
  const session = event.data.object;
  const submissionId = session.client_reference_id;
  if (!submissionId) return;

  const submission = await findSubmissionById(submissionId);
  if (!submission) {
    console.warn(
      `[stripe-webhook] submission ${submissionId} not found for expired event ${event.id}`,
    );
    return;
  }
  if (submission.stripeEventId === event.id) return;

  await markSubmissionExpired(submission._id, {
    stripeEventId: event.id,
    expiredAt: unixToIso(event.created),
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
