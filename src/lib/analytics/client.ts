"use client";

import mixpanel from "mixpanel-browser";

import { PRODUCTION_HOSTS } from "@/lib/constants";

import type { ClientEventMap, ClientEventName } from "./events";

let bootstrapped = false;
let mixpanelLive = false;

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

const HEADLESS_UA_PATTERN = /headless|HeadlessChrome|Lighthouse|PhantomJS|Puppeteer|Playwright/i;

function deriveEnvironment(host: string): string {
  if (PRODUCTION_HOSTS.includes(host)) return "production";
  if (host.startsWith("preview.")) return "preview";
  if (host.endsWith(".workers.dev")) return "workers-dev";
  return "local";
}

export function initAnalytics(): void {
  if (bootstrapped) return;
  if (typeof window === "undefined") return;
  bootstrapped = true;

  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    queue.length = 0;
    return;
  }

  const host = window.location.host;
  const env = deriveEnvironment(host);
  const trackNonProd = process.env.NEXT_PUBLIC_TRACK_NON_PROD === "1";
  if (env !== "production" && !trackNonProd) {
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
    environment: env,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
  });

  if (HEADLESS_UA_PATTERN.test(window.navigator.userAgent)) {
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
  if (bootstrapped) return;
  if (queue.length >= MAX_QUEUED_EVENTS) return;
  queue.push({ event, properties: props });
}

export function identifySubmission(submissionId: string): void {
  if (!mixpanelLive) return;
  mixpanel.identify(submissionId);
}

export function isAnalyticsInitialized(): boolean {
  return bootstrapped;
}

export function _resetForTests(): void {
  bootstrapped = false;
  mixpanelLive = false;
  queue.length = 0;
}
