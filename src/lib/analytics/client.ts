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

let initialized = false;

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
  if (initialized) return;
  if (typeof window === "undefined") return;

  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    // Drain the queue as a no-op so callers don't see indefinite growth
    // when the token isn't configured (local dev without .env.local).
    initialized = true;
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

  const host = window.location.host;
  mixpanel.register({
    site_host: host,
    environment: deriveEnvironment(host),
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
  });

  if (isHeadlessUserAgent(window.navigator.userAgent)) {
    mixpanel.register({ $ignore: true });
  }

  initialized = true;

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
  if (!initialized) {
    queue.push({ event, properties: props });
    return;
  }
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return;
  mixpanel.track(event, props);
}

/**
 * Alias the auto-generated browser distinct_id to the submission UUID.
 * Called once at `intake_submit_success` so the rest of the funnel
 * (Stripe redirect, server-side payment_success/email_sent/delivery_listened
 * events from PR-F2) threads on the same identity.
 */
export function identifySubmission(submissionId: string): void {
  if (!initialized) return;
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return;
  mixpanel.identify(submissionId);
}

export function isAnalyticsInitialized(): boolean {
  return initialized;
}

/**
 * Test-only: reset the module-scoped `initialized` flag and queue so
 * each test starts from a clean baseline. Not exported from `index.ts`.
 */
export function _resetForTests(): void {
  initialized = false;
  queue.length = 0;
}
