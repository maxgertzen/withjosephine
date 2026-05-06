"use client";

import * as Sentry from "@sentry/browser";

import { deriveEnvironmentFromHost } from "@/lib/constants";

let bootstrapped = false;
let live = false;

// Mirror of custom-worker.ts scrubSensitiveRequestData. The listen page carries
// an HMAC-signed delivery token in the URL path; cookies and Authorization
// headers can carry session-equivalent secrets. None should be replayable from
// the issue tracker.
function scrubSensitiveData(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const request = event.request;
  if (request?.headers && typeof request.headers === "object") {
    delete (request.headers as Record<string, unknown>).cookie;
    delete (request.headers as Record<string, unknown>).authorization;
  }
  if (request?.url) {
    request.url = request.url.replace(/\/listen\/[^/?#]+/, "/listen/[REDACTED]");
  }
  return event;
}

export function initSentryClient(): void {
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
      integrations: [],
    });
    live = true;
  } catch (err) {
    console.warn("[sentry-client] init failed", err);
  }
}

export function captureException(error: unknown): void {
  if (!live) return;
  Sentry.captureException(error);
}

export function isSentryInitialized(): boolean {
  return bootstrapped;
}

export function _resetForTests(): void {
  bootstrapped = false;
  live = false;
}
