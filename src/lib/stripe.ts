import Stripe from "stripe";

import { requireEnv } from "./env";
import { taintServerObject } from "./taint";

type StripeApiHostOptions = Pick<
  NonNullable<ConstructorParameters<typeof Stripe>[1]>,
  "host" | "port" | "protocol"
>;

let cachedClient: Stripe | null = null;

function e2eApiHostOverride(): StripeApiHostOptions {
  const apiHost = process.env.E2E === "1" ? process.env.STRIPE_API_HOST : undefined;
  if (!apiHost) return {};
  const url = new URL(apiHost);
  return {
    host: url.hostname,
    port: url.port,
    protocol: url.protocol === "http:" ? "http" : "https",
  };
}

function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  // Cloudflare Workers: the Stripe SDK defaults to node:http which workerd
  // doesn't expose — calls hang until the worker times out. createFetchHttpClient
  // routes the SDK through global fetch, which workerd does support.
  cachedClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    httpClient: Stripe.createFetchHttpClient(),
    timeout: 5000,
    ...e2eApiHostOverride(),
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

export async function retrieveCheckoutSession(
  id: string,
  expand?: string[],
): Promise<Stripe.Checkout.Session> {
  return getStripeClient().checkout.sessions.retrieve(id, expand ? { expand } : undefined);
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

export type KeptPayment = {
  clientReferenceId: string | null;
  paymentStatus: Stripe.Checkout.Session["payment_status"];
  charge: Pick<Stripe.Charge, "status" | "refunded" | "amount_refunded" | "disputed"> | null;
};

function latestCharge(session: Stripe.Checkout.Session): Stripe.Charge | null {
  const { payment_intent: paymentIntent } = session;
  if (!paymentIntent || typeof paymentIntent === "string") return null;
  const charge = paymentIntent.latest_charge;
  return charge && typeof charge !== "string" ? charge : null;
}

export const KEPT_PAYMENT_EXPAND = ["payment_intent.latest_charge"];

export async function retrieveKeptPayment(sessionId: string): Promise<KeptPayment> {
  const session = await retrieveCheckoutSession(sessionId, KEPT_PAYMENT_EXPAND);
  return {
    clientReferenceId: session.client_reference_id,
    paymentStatus: session.payment_status,
    charge: latestCharge(session),
  };
}

export type DuplicateRefundAttempt =
  | { kind: "refund"; refund: Stripe.Refund }
  | { kind: "no_payment_intent" }
  | { kind: "nothing_to_refund" }
  | { kind: "already_refunded" }
  | { kind: "in_flight" };

const QUIET_REFUND_ERRORS: Partial<Record<string, DuplicateRefundAttempt>> = {
  charge_already_refunded: { kind: "already_refunded" },
  idempotency_key_in_use: { kind: "in_flight" },
};

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const { payment_intent: paymentIntent } = session;
  if (!paymentIntent) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

function currentUtcHour(): string {
  return new Date().toISOString().slice(0, "YYYY-MM-DDTHH".length);
}

function stripeErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "";
}

export function duplicateRefundKey(stripeSessionId: string): string {
  return `duplicate-refund/${stripeSessionId}`;
}

export async function refundDuplicateCheckoutSession(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>,
): Promise<DuplicateRefundAttempt> {
  if (!session.amount_total) return { kind: "nothing_to_refund" };
  const paymentIntent = paymentIntentId(session);
  if (!paymentIntent) return { kind: "no_payment_intent" };

  try {
    const refund = await getStripeClient().refunds.create(
      { payment_intent: paymentIntent, reason: "duplicate", metadata },
      { idempotencyKey: `${duplicateRefundKey(session.id)}/${currentUtcHour()}` },
    );
    return { kind: "refund", refund };
  } catch (error) {
    const quiet = QUIET_REFUND_ERRORS[stripeErrorCode(error)];
    if (quiet) return quiet;
    throw error;
  }
}
