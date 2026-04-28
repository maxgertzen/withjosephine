import Stripe from "stripe";

import { requireEnv } from "./env";

let cachedClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  cachedClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return cachedClient;
}

// Raw body required — Stripe signature verification hashes the exact bytes received.
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string,
): Stripe.Event {
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
  return getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
}
