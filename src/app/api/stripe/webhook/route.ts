import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { serverTrack } from "@/lib/analytics/server";
import { applyPaidSession, type PaidSessionOutcome } from "@/lib/booking/applyPaidSession";
import {
  findSubmissionById,
  markSubmissionExpired,
  SUBMISSION_STATUS,
} from "@/lib/booking/submissions";
import { giftIdFromClientReferenceId } from "@/lib/gift/clientReference";
import { expireGift } from "@/lib/gift/expireGift";
import { constructWebhookEvent } from "@/lib/stripe";
import { unixToIso } from "@/lib/stripeSession";

const SIGNATURE_HEADER = "stripe-signature";

function trackPaymentSuccess(outcome: PaidSessionOutcome, session: Stripe.Checkout.Session): void {
  if (outcome.kind !== "booking" || outcome.result !== "applied") return;

  const { submission, paid } = outcome;
  void serverTrack("payment_success", {
    distinct_id: submission._id,
    submission_id: submission._id,
    reading_id: submission.reading?.slug ?? "",
    amount_paid_cents: paid.amountPaidCents,
    currency: paid.amountPaidCurrency,
    stripe_session_id: session.id,
  });
}

async function handleCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
): Promise<PaidSessionOutcome> {
  const session = event.data.object;
  const paidAt = unixToIso(event.created);
  const outcome = await applyPaidSession(session, { stripeEventId: event.id, paidAt });

  if (outcome.kind === "no_reference") {
    console.warn(`[stripe-webhook] event ${event.id} has no client_reference_id`);
  }
  trackPaymentSuccess(outcome, session);
  return outcome;
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
    case "checkout.session.completed": {
      const outcome = await handleCompleted(event);
      if (outcome.kind === "record_not_found") {
        return NextResponse.json({ error: "Paid record not found" }, { status: 500 });
      }
      break;
    }
    case "checkout.session.expired":
      await handleExpired(event);
      break;
  }

  return NextResponse.json({ received: true });
}
