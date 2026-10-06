import Stripe from "stripe";
import { vi } from "vitest";

const TEST_WEBHOOK_SECRET = "whsec_test_vitest";
const EVENT_SECONDS_AFTER_SESSION = 60;

export type CheckoutEventType = "checkout.session.completed" | "checkout.session.expired";

export async function deliverCheckoutEvent(
  type: CheckoutEventType,
  session: Stripe.Checkout.Session,
): Promise<Response> {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_vitest");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET);
  const payload = JSON.stringify({
    id: `evt_test_${crypto.randomUUID()}`,
    object: "event",
    type,
    created: session.created + EVENT_SECONDS_AFTER_SESSION,
    data: { object: session },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: TEST_WEBHOOK_SECRET,
  });
  const { POST } = await import("@/app/api/stripe/webhook/route");
  return POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    }),
  );
}
