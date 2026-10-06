import type { APIRequestContext } from "@playwright/test";

import { sidecarUrl } from "./captureStore";

export type StubCheckoutSession = {
  id: string;
  client_reference_id?: string | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required";
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  country?: string;
  created?: number;
};

export function newStripeSessionId(): string {
  return `cs_test_${crypto.randomUUID().slice(0, 8)}`;
}

export function buildStubCheckoutSession({
  id,
  client_reference_id = null,
  payment_status = "paid",
  amount_total = null,
  currency = null,
  customer_email = null,
  country = "US",
  created = Math.floor(Date.now() / 1000),
}: StubCheckoutSession) {
  return {
    id,
    object: "checkout.session",
    created,
    status: "complete",
    payment_status,
    client_reference_id,
    amount_total,
    currency,
    customer: null,
    customer_details: { email: customer_email, address: { country } },
    metadata: {},
  };
}

export async function registerStripeSession(
  request: APIRequestContext,
  session: StubCheckoutSession,
): Promise<void> {
  const res = await request.post(`${sidecarUrl()}/_e2e/stripe-sessions`, { data: session });
  if (!res.ok()) {
    throw new Error(`Failed to register Stripe session: ${res.status()} ${await res.text()}`);
  }
}
