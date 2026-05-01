"use client";

import mixpanel from "mixpanel-browser";

import type { ClientEventMap, ClientEventName } from "./events";

/**
 * Mixpanel client wrapper. Single source of truth for SDK init and
 * `track()` calls — callers go through `track(eventName, properties)`,
 * never `mixpanel.track(...)` directly. Lets us swap providers without
 * touching call sites (per SPEC §15).
 *
 * Design notes:
 *
 * - **Pre-init buffer.** React commits effects deepest-first, so a
 *   child's `track("entry_page_view")` fires before the layout's
 *   `initAnalytics()` effect. We queue events fired before init and
 *   flush them once the SDK is up. ChargeAfter's tracker uses the
 *   same pattern (libs/infra/tracker/src/lib/Tracker.ts).
 * - **No-op when token is unset** (dev without `.env.local` configured,
 *   or any non-production build that didn't forward the env var).
 *   Buffer still drains on the unset case via a no-op flush.
 * - **No PII.** Events ship `reading_id`, `page_number`, `field_key`,
 *   `submission_id` (UUID). Never email/name/photos.
 * - **IP anonymization.** SDK initialized with `ip: false`.
 * - **Bot filter.** `mixpanel.register({ $ignore: true })` for headless
 *   user agents (Lighthouse, Playwright, Puppeteer, headless Chrome).
 *   Mixpanel's ingest API drops events on `$ignore: true` (per
 *   docs.mixpanel.com/.../bot-traffic).
 * - **Environment super property.** `environment` derived from hostname
 *   (production / preview / workers-dev / local) so dev events can be
 *   filtered out of funnels even on a single Mixpanel project. The
 *   dev/prod project split lands with the staging-tier work.
 *
 * Project token is `NEXT_PUBLIC_MIXPANEL_TOKEN` — public by design (it
 * ships in the browser bundle), but still subject to the CI env-block
 * forwarding discipline (.github/workflows/ci.yml + GH Actions vars).
 */

// Two flags, not one. `bootstrapped` is the idempotency guard for
// initAnalytics() — set to true the first time it runs regardless of
// whether the SDK actually inited. `mixpanelLive` is set ONLY when
// mixpanel.init() actually ran (token present, on prod or opted in,
// not blocked). track() uses both: if mixpanelLive → ship event;
// else if bootstrapped → drop (init has already decided to no-op);
// else → queue (init hasn't run yet, flush after init).
let bootstrapped = false;
let mixpanelLive = false;

type QueuedEvent = {
  event: string;
  properties: Record<string, unknown>;
};

const queue: QueuedEvent[] = [];

function deriveEnvironment(host: string): string {
  if (host === "withjosephine.com" || host === "www.withjosephine.com") {
    return "production";
  }
  if (host.startsWith("preview.")) return "preview";
  if (host.endsWith(".workers.dev")) return "workers-dev";
  return "local";
}

function isHeadlessUserAgent(userAgent: string): boolean {
  return /headless|HeadlessChrome|Lighthouse|PhantomJS|Puppeteer|Playwright/i.test(
    userAgent,
  );
}

export function initAnalytics(): void {
  if (bootstrapped) return;
  if (typeof window === "undefined") return;
  bootstrapped = true;

  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    // Drain the queue as a no-op so callers don't see indefinite growth
    // when the token isn't configured (local dev without .env.local).
    queue.length = 0;
    return;
  }

  // Non-production environments (local, preview, workers-dev) skip
  // tracking by default so dev events don't pollute the production
  // Mixpanel project. Set NEXT_PUBLIC_TRACK_NON_PROD=1 in .env.local
  // (or as a GH Actions var on the relevant deploy) to opt-in — needed
  // when verifying new event wiring or running the booking flow against
  // a non-prod host. Bridge until the dev/prod project split lands
  // with the staging-tier work in POST_LAUNCH_BACKLOG.md.
  const host = window.location.host;
  const env = deriveEnvironment(host);
  const isProduction = env === "production";
  const trackNonProd = process.env.NEXT_PUBLIC_TRACK_NON_PROD === "1";
  if (!isProduction && !trackNonProd) {
    queue.length = 0;
    return;
  }

  mixpanel.init(token, {
    debug: false,
    track_pageview: false,
    persistence: "localStorage",
    // ignore_dnt MUST be true. DNT was deprecated by W3C in 2019 — modern
    // browsers ship it on by default in some modes (Brave, Firefox strict,
    // Edge tracking protection, manual Chrome toggle), so respecting it
    // silently breaks tracking for a meaningful slice of users WITHOUT
    // gaining a meaningful privacy stance. Our actual consent posture is:
    // the EU/EEA/UK/CH/CA geo-conditional banner gates init, IP is
    // anonymized via `ip: false`, and no PII is included in event
    // properties. Flipping ignore_dnt back to false would silently
    // swallow every track() call for any visitor with DNT on.
    ignore_dnt: true,
    ip: false,
    property_blacklist: ["$current_url", "$initial_referrer", "$referrer"],
  });

  mixpanel.register({
    site_host: host,
    environment: env,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
  });

  if (isHeadlessUserAgent(window.navigator.userAgent)) {
    mixpanel.register({ $ignore: true });
  }

  mixpanelLive = true;

  for (const item of queue) {
    mixpanel.track(item.event, item.properties);
  }
  queue.length = 0;
}

export function track<E extends ClientEventName>(
  event: E,
  properties: ClientEventMap[E],
): void {
  const props = properties as Record<string, unknown>;
  if (mixpanelLive) {
    mixpanel.track(event, props);
    return;
  }
  if (bootstrapped) {
    // initAnalytics() already ran and decided to no-op (no token,
    // non-prod without opt-in, etc.). Drop the event.
    return;
  }
  // initAnalytics() hasn't run yet. Queue for flush.
  queue.push({ event, properties: props });
}

/**
 * Alias the auto-generated browser distinct_id to the submission UUID.
 * Called once at `intake_submit_success` so the rest of the funnel
 * (Stripe redirect, server-side payment_success/email_sent/delivery_listened
 * events from PR-F2) threads on the same identity.
 */
export function identifySubmission(submissionId: string): void {
  if (!mixpanelLive) return;
  mixpanel.identify(submissionId);
}

export function isAnalyticsInitialized(): boolean {
  return bootstrapped;
}

/**
 * Test-only: reset the module-scoped flags and queue so each test
 * starts from a clean baseline. Not exported from `index.ts`.
 */
export function _resetForTests(): void {
  bootstrapped = false;
  mixpanelLive = false;
  queue.length = 0;
}
