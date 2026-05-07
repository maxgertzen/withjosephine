import { deriveEnvironmentFromHost } from "@/lib/constants";

/**
 * Single source of truth for whether browser-side observability (Mixpanel,
 * Clarity, future tools) should activate on the current host. Production
 * always activates; non-prod requires explicit `NEXT_PUBLIC_TRACK_NON_PROD=1`
 * opt-in to avoid polluting dashboards with local / preview / workers.dev
 * traffic.
 *
 * Sentry currently does NOT gate on this — it sends to a dedicated
 * environment field per host, so non-prod errors are useful triage signal.
 * Keep it that way unless we add a separate Sentry-gating policy.
 */
export function shouldEnableClientObservability(host: string): boolean {
  const env = deriveEnvironmentFromHost(host);
  if (env === "production") return true;
  return process.env.NEXT_PUBLIC_TRACK_NON_PROD === "1";
}
