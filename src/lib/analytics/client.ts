"use client";

import { deriveEnvironmentFromHost } from "@/lib/constants";
import { shouldEnableClientObservability } from "@/lib/observability-gate";

import type { ClientEventMap, ClientEventName } from "./events";
import { HEADLESS_UA_PATTERN } from "./headless";

// mixpanel-browser (~120KB brotli) is imported dynamically inside
// initAnalytics so it lands in an async chunk loaded only after consent,
// off the first-paint critical path. Events fired before it loads queue.
type Mixpanel = (typeof import("mixpanel-browser"))["default"];

let bootstrapped = false;
let mixpanelLoading = false;
let mp: Mixpanel | null = null;

type QueuedEvent = {
  event: string;
  properties: Record<string, unknown>;
};

// Cap on the pre-init buffer. The window between module load and
// AnalyticsBootstrap's effect is short (~50ms), so a few entries is
// realistic; the cap defends against pathological growth if init is
// somehow delayed (SSR-only path, broken bootstrap).
const MAX_QUEUED_EVENTS = 100;
const queue: QueuedEvent[] = [];

export async function initAnalytics() {
  if (bootstrapped) return;
  if (typeof window === "undefined") return;
  bootstrapped = true;

  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    queue.length = 0;
    return;
  }

  const host = window.location.host;
  if (!shouldEnableClientObservability(host)) {
    queue.length = 0;
    return;
  }

  mixpanelLoading = true;
  let mixpanel: Mixpanel;
  try {
    mixpanel = (await import("mixpanel-browser")).default;
  } catch {
    // A stale async chunk after a deploy rejects the import. Disable
    // analytics cleanly instead of wedging mixpanelLoading true forever.
    mixpanelLoading = false;
    queue.length = 0;
    return;
  }

  mixpanel.init(token, {
    debug: false,
    track_pageview: false,
    persistence: "localStorage",
    // DNT was deprecated by W3C in 2019 and ships on by default in
    // Brave / Firefox strict / Edge tracking-protection. Respecting it
    // silently swallows track() calls without gaining a meaningful
    // privacy stance — the real gate is the consent banner.
    ignore_dnt: true,
    ip: false,
    property_blacklist: ["$current_url", "$initial_referrer", "$referrer"],
  });

  mixpanel.register({
    site_host: host,
    environment: deriveEnvironmentFromHost(host),
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
  });

  if (HEADLESS_UA_PATTERN.test(window.navigator.userAgent)) {
    mixpanel.register({ $ignore: true });
  }

  mp = mixpanel;
  mixpanelLoading = false;

  for (const item of queue) {
    mp.track(item.event, item.properties);
  }
  queue.length = 0;
}

export function track<E extends ClientEventName>(event: E, properties: ClientEventMap[E]) {
  const props = properties as Record<string, unknown>;
  if (mp) {
    mp.track(event, props);
    return;
  }
  if (bootstrapped && !mixpanelLoading) return;
  if (queue.length >= MAX_QUEUED_EVENTS) return;
  queue.push({ event, properties: props });
}

/**
 * Loose-typed escape hatch for the delegated `data-mp-*` listener. Not
 * for direct use — every SPEC §15 event has a typed entry in
 * `ClientEventMap` and must go through `track()`. This path exists so
 * ad-hoc `<button data-mp-event="…" data-mp-…="…">` instrumentation
 * doesn't have to widen the typed map for every surface.
 */
export function trackUntyped(event: string, properties: Record<string, unknown>) {
  if (mp) {
    mp.track(event, properties);
    return;
  }
  if (bootstrapped && !mixpanelLoading) return;
  if (queue.length >= MAX_QUEUED_EVENTS) return;
  queue.push({ event, properties });
}

const lastTrackedAt = new Map<string, number>();

export function trackThrottled<E extends ClientEventName>(
  event: E,
  properties: ClientEventMap[E],
  intervalMs: number,
) {
  const now = Date.now();
  const last = lastTrackedAt.get(event) ?? 0;
  if (now - last < intervalMs) return;
  lastTrackedAt.set(event, now);
  track(event, properties);
}

export function identifySubmission(submissionId: string) {
  if (!mp) return;
  mp.identify(submissionId);
}

export function isAnalyticsInitialized() {
  return bootstrapped;
}

export function _resetForTests() {
  bootstrapped = false;
  mixpanelLoading = false;
  mp = null;
  queue.length = 0;
  lastTrackedAt.clear();
}
