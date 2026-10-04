"use client";

import * as Sentry from "@sentry/browser";

import { deriveEnvironmentFromHost } from "@/lib/constants";
import { scrubBreadcrumb, scrubSentryRequest } from "@/lib/logging/redactSearchParams";

let bootstrapped = false;
let live = false;

function scrubSensitiveData(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  scrubSentryRequest(event.request);
  return event;
}

export function initSentryClient() {
  if (bootstrapped) return;
  if (typeof window === "undefined") return;
  bootstrapped = true;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  // Don't let the error tracker break the error path: a Sentry.init throw
  // from AnalyticsBootstrap's effect would bubble straight into the React
  // error boundary we're trying to capture from.
  try {
    Sentry.init({
      dsn,
      environment: deriveEnvironmentFromHost(window.location.host),
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      tracesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: scrubSensitiveData,
      beforeBreadcrumb: scrubBreadcrumb,
      integrations: [],
    });
    live = true;
  } catch (err) {
    console.warn("[sentry-client] init failed", err);
  }
}

export function captureException(error: unknown) {
  if (!live) return;
  Sentry.captureException(error);
}

export function isSentryInitialized() {
  return bootstrapped;
}

export function _resetForTests() {
  bootstrapped = false;
  live = false;
}
