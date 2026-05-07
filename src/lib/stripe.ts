import Stripe from "stripe";

import { requireEnv } from "./env";
import { taintServerObject } from "./taint";

let cachedClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  // Cloudflare Workers: the Stripe SDK defaults to node:http which workerd
  // doesn't expose — calls hang until the worker times out. createFetchHttpClient
  // routes the SDK through global fetch, which workerd does support.
  cachedClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    httpClient: Stripe.createFetchHttpClient(),
    timeout: 5000,
  });
  taintServerObject(
    "Stripe client carries STRIPE_SECRET_KEY; do not pass to client components.",
    cachedClient,
  );
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

export async function retrieveCheckoutSession(id: string): Promise<Stripe.Checkout.Session> {
  return getStripeClient().checkout.sessions.retrieve(id);
}

export async function listRecentCompletedCheckoutSessions(
  sinceUnixSeconds: number,
): Promise<Stripe.Checkout.Session[]> {
  const sessions: Stripe.Checkout.Session[] = [];
  for await (const session of getStripeClient().checkout.sessions.list({
    created: { gte: sinceUnixSeconds },
    limit: 100,
  })) {
    if (session.status === "complete") sessions.push(session);
  }
  return sessions;
}
