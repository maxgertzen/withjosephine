import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { serverTrack } from "@/lib/analytics/server";
import { formatAmountPaid } from "@/lib/booking/formatAmount";
import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import {
  appendEmailFired,
  findSubmissionById,
  markGiftClaimSent,
  markSubmissionExpired,
} from "@/lib/booking/submissions";
import { sendGiftPurchaseConfirmation } from "@/lib/resend";
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

  const result = await applyPaidEvent(submission, {
    stripeEventId: event.id,
    stripeSessionId: session.id,
    paidAt: unixToIso(event.created),
    amountPaidCents: session.amount_total ?? null,
    amountPaidCurrency: session.currency ?? null,
    country: session.customer_details?.address?.country ?? null,
  });

  if (result === "applied") {
    void serverTrack("payment_success", {
      distinct_id: submission._id,
      submission_id: submission._id,
      reading_id: submission.reading?.slug ?? "",
      amount_paid_cents: session.amount_total ?? null,
      currency: session.currency ?? null,
      stripe_session_id: session.id,
    });

    if (submission.isGift && submission.giftDeliveryMethod) {
      await dispatchGiftPurchaseConfirmation(submission, session);
    }
  }
}

function formatSendAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function extractFirstName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const lead = local.split(/[._+-]/)[0] ?? local;
  return lead ? lead.charAt(0).toUpperCase() + lead.slice(1) : "there";
}

async function dispatchGiftPurchaseConfirmation(
  submission: Awaited<ReturnType<typeof findSubmissionById>>,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (!submission || !submission.giftDeliveryMethod) return;

  const readingName = submission.reading?.name ?? "reading";
  const readingPriceDisplay = submission.reading?.priceDisplay ?? "";
  const amountPaidDisplay = formatAmountPaid(
    session.amount_total ?? null,
    session.currency ?? null,
  );
  const recipientName =
    submission.responses.find((r) => r.fieldKey === "recipient_name")?.value || null;
  const purchaserFirstNameFromResponses = submission.responses
    .find((r) => r.fieldKey === "purchaser_first_name")
    ?.value?.trim();
  const purchaserFirstName = purchaserFirstNameFromResponses || extractFirstName(submission.email);

  const nowIso = new Date().toISOString();

  void serverTrack("gift_purchased", {
    distinct_id: submission._id,
    submission_id: submission._id,
    reading_id: submission.reading?.slug ?? "",
    delivery_method: submission.giftDeliveryMethod,
    send_at: submission.giftSendAt ?? null,
  });

  if (submission.giftDeliveryMethod === "self_send") {
    const { tokenHash, claimUrl } = await issueGiftClaimToken();
    await markGiftClaimSent(submission._id, tokenHash, nowIso);

    const result = await sendGiftPurchaseConfirmation({
      submissionId: submission._id,
      purchaserEmail: submission.email,
      purchaserFirstName,
      readingName,
      readingPriceDisplay,
      amountPaidDisplay,
      recipientName,
      giftMessage: submission.giftMessage,
      variant: "self_send",
      claimUrl,
    });
    await appendEmailFired(submission._id, {
      type: "gift_purchase_confirmation",
      sentAt: nowIso,
      resendId: result.resendId,
    });
    return;
  }

  const result = await sendGiftPurchaseConfirmation({
    submissionId: submission._id,
    purchaserEmail: submission.email,
    purchaserFirstName,
    readingName,
    readingPriceDisplay,
    amountPaidDisplay,
    recipientName,
    giftMessage: submission.giftMessage,
    variant: "scheduled",
    sendAtDisplay: formatSendAt(submission.giftSendAt ?? nowIso),
  });
  await appendEmailFired(submission._id, {
    type: "gift_purchase_confirmation",
    sentAt: nowIso,
    resendId: result.resendId,
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
