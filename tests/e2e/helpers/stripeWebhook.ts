import type { APIRequestContext, APIResponse } from "@playwright/test";
import Stripe from "stripe";

import { buildStubCheckoutSession, newStripeSessionId } from "./stripeStub";

type CheckoutCompletedOverrides = {
  amountTotal?: number;
  currency?: string;
  country?: string;
  stripeSessionId?: string;
  customerEmail?: string;
  paymentStatus?: Stripe.Checkout.Session["payment_status"];
};

type CheckoutExpiredOverrides = {
  stripeSessionId?: string;
};

export type SignedWebhookPayload = {
  body: string;
  signature: string;
};

function signCheckoutEvent(
  type: "checkout.session.completed" | "checkout.session.expired",
  session: Record<string, unknown>,
): SignedWebhookPayload {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "[e2e/stripeWebhook] STRIPE_WEBHOOK_SECRET is not set — playwright.config.ts is the source of truth at module scope.",
    );
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const event = {
    id: `evt_test_${crypto.randomUUID().slice(0, 8)}`,
    type,
    api_version: "2024-09-30.acacia",
    created: timestamp,
    livemode: false,
    object: "event",
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: { object: { object: "checkout.session", ...session } },
  };
  const body = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp });
  return { body, signature };
}

function postWebhook(
  request: APIRequestContext,
  { body, signature }: SignedWebhookPayload,
): Promise<APIResponse> {
  return request.post("/api/stripe/webhook", {
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    data: body,
  });
}

const DEFAULT_PAID_AMOUNT_CENTS = 9900;
const DEFAULT_PAID_CURRENCY = "usd";

export function buildCheckoutCompletedPayload(
  clientReferenceId: string,
  overrides: CheckoutCompletedOverrides = {},
): SignedWebhookPayload {
  return signCheckoutEvent(
    "checkout.session.completed",
    buildStubCheckoutSession({
      id: overrides.stripeSessionId ?? newStripeSessionId(),
      client_reference_id: clientReferenceId,
      customer_email: overrides.customerEmail,
      country: overrides.country,
      amount_total: overrides.amountTotal ?? DEFAULT_PAID_AMOUNT_CENTS,
      currency: overrides.currency ?? DEFAULT_PAID_CURRENCY,
      payment_status: overrides.paymentStatus,
    }),
  );
}

export function buildCheckoutExpiredPayload(
  clientReferenceId: string,
  overrides: CheckoutExpiredOverrides = {},
): SignedWebhookPayload {
  return signCheckoutEvent("checkout.session.expired", {
    id: overrides.stripeSessionId ?? newStripeSessionId(),
    client_reference_id: clientReferenceId,
    customer: null,
    customer_details: null,
    amount_total: null,
    currency: "usd",
    status: "expired",
    payment_status: "unpaid",
  });
}

export async function fireCheckoutCompleted(
  request: APIRequestContext,
  clientReferenceId: string,
  overrides: CheckoutCompletedOverrides = {},
): Promise<APIResponse> {
  return postWebhook(request, buildCheckoutCompletedPayload(clientReferenceId, overrides));
}

export async function fireCheckoutExpired(
  request: APIRequestContext,
  clientReferenceId: string,
  overrides: CheckoutExpiredOverrides = {},
): Promise<APIResponse> {
  return postWebhook(request, buildCheckoutExpiredPayload(clientReferenceId, overrides));
}
