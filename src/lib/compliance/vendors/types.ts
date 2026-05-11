/**
 * Shared types for Phase 4 vendor deletion helpers. Each helper returns the
 * same `VendorResult` shape so the cascade can build a uniform partialFailures
 * list across Stripe / Brevo / Mixpanel without per-vendor branching.
 *
 * `trackingId` is non-null only for vendors that respond asynchronously and
 * give us a polling handle (Stripe Redaction Job id, Brevo SMTP-log process
 * id, Mixpanel data-deletions task id). The reconciliation cron (out of
 * Phase 4 scope; filed in POST_LAUNCH_BACKLOG) will use these to confirm
 * completion against vendor status endpoints.
 */
export type VendorResult =
  | { ok: true; trackingId: string | null }
  | { ok: false; error: string };

/** Convenience constructor for the not-configured case — env var missing.
 * Cascade treats this as a partial failure but continues.
 */
export function vendorNotConfigured(vendor: string): VendorResult {
  return { ok: false, error: `${vendor}: not configured` };
}
