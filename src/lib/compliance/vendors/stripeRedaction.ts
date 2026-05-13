import "server-only";

/**
 * Stripe Redaction Jobs API — GDPR Art. 17 cascade target.
 *
 * Verified 2026-05-11 against the official Stripe API reference:
 * https://docs.stripe.com/api/privacy/redaction-job/create
 * https://docs.stripe.com/api/privacy/redaction-job/run
 * https://docs.stripe.com/privacy/redaction
 *
 * Two-phase async surface (NOT the legacy `DELETE /v1/customers/:id`):
 *  1. POST /v1/privacy/redaction_jobs — status goes `validating → ready`
 *     (validation can take up to 30 days for high-volume objects).
 *  2. POST /v1/privacy/redaction_jobs/{id}/run — required to execute the
 *     redaction once status is `ready`. Phase 4 cascade only creates the
 *     job here and returns the id; a reconciliation cron (out of scope,
 *     filed in POST_LAUNCH_BACKLOG) polls status and calls `/run` when
 *     ready.
 *
 * `validation_behavior=fix` is the admin-path default — `error` (Stripe
 * default) fails the job on common cases like open disputes, pending
 * settlement, or active subscriptions. `fix` lets Stripe skip those rather
 * than reject the whole batch, which is what we want from a "right to be
 * forgotten" trigger.
 *
 * The SDK (`stripe@22`) does not yet expose typed bindings for
 * /v1/privacy/redaction_jobs. We call the REST endpoint directly with the
 * same Basic auth + form-encoded body shape the SDK uses.
 *
 * On redaction, the customer + related objects (Charges, PaymentIntents,
 * CheckoutSessions, etc.) survive with `[redacted]` placeholders rather
 * than being deleted — exactly what GDPR Art. 17(3)(b) financial-records
 * retention requires. Customer-facing copy MUST say "Stripe redacts your
 * personally identifying fields; the transaction record itself is retained
 * as legally required" — NEVER "Stripe deleted your record" (per PRD
 * ISC-A2).
 */
import { requireEnv } from "../../env";
import type { VendorResult } from "./types";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export type StripeRedactionInput = {
  /** Stripe customer IDs (`cus_...`). May be empty for guest checkouts. */
  customerIds: string[];
  /** Checkout-session IDs (`cs_...`). Always populated from D1 submissions. */
  checkoutSessionIds: string[];
};

function buildBody(input: StripeRedactionInput): URLSearchParams {
  const body = new URLSearchParams();
  body.set("validation_behavior", "fix");
  for (const id of input.customerIds) body.append("objects[customers][]", id);
  for (const id of input.checkoutSessionIds) body.append("objects[checkout_sessions][]", id);
  return body;
}

export async function createStripeRedactionJob(
  input: StripeRedactionInput,
): Promise<VendorResult> {
  if (input.customerIds.length === 0 && input.checkoutSessionIds.length === 0) {
    return { ok: false, error: "stripe: no objects to redact" };
  }

  let apiKey: string;
  try {
    apiKey = requireEnv("STRIPE_SECRET_KEY");
  } catch {
    return { ok: false, error: "stripe: STRIPE_SECRET_KEY missing" };
  }

  try {
    const response = await fetch(`${STRIPE_API_BASE}/privacy/redaction_jobs`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildBody(input).toString(),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "<no body>");
      return { ok: false, error: `stripe: HTTP ${response.status} — ${detail.slice(0, 200)}` };
    }

    const json = (await response.json()) as { id?: string };
    if (typeof json.id !== "string") {
      return { ok: false, error: "stripe: response missing id" };
    }
    return { ok: true, trackingId: json.id };
  } catch (error) {
    return { ok: false, error: `stripe: ${error instanceof Error ? error.message : String(error)}` };
  }
}
