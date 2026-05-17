import type { APIRequestContext, APIResponse } from "@playwright/test";
import Stripe from "stripe";

type CheckoutCompletedOverrides = {
  amountTotal?: number;
  currency?: string;
  country?: string;
  stripeSessionId?: string;
  customerEmail?: string;
};

export type SignedWebhookPayload = {
  body: string;
  signature: string;
};

/**
 * Build a `checkout.session.completed` event payload + signature suitable for
 * POSTing to `/api/stripe/webhook`. The handler verifies via
 * `Stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`; the same
 * secret signs the test header here. Use an explicit timestamp (now) to dodge
 * the 5-min skew tolerance on slow CI runners.
 */
export function buildCheckoutCompletedPayload(
  submissionId: string,
  overrides: CheckoutCompletedOverrides = {},
): SignedWebhookPayload {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET must be set to sign test webhook payloads",
    );
  }
  const sessionId =
    overrides.stripeSessionId ?? `cs_test_${crypto.randomUUID().slice(0, 8)}`;
  const event = {
    id: `evt_test_${crypto.randomUUID().slice(0, 8)}`,
    type: "checkout.session.completed",
    api_version: "2024-09-30.acacia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    object: "event",
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        client_reference_id: submissionId,
        customer: null,
        customer_details: {
          email: overrides.customerEmail ?? null,
          address: { country: overrides.country ?? "US" },
        },
        amount_total: overrides.amountTotal ?? 9900,
        currency: overrides.currency ?? "usd",
        status: "complete",
        payment_status: "paid",
      },
    },
  };
  const body = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp: Math.floor(Date.now() / 1000),
  });
  return { body, signature };
}

export async function fireCheckoutCompleted(
  request: APIRequestContext,
  submissionId: string,
  overrides: CheckoutCompletedOverrides = {},
): Promise<APIResponse> {
  const { body, signature } = buildCheckoutCompletedPayload(submissionId, overrides);
  return request.post("/api/stripe/webhook", {
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
    data: body,
  });
}
