// Wraps the OpenNext-generated worker fetch handler with Sentry error capture.
// OpenNext's customWorker pattern: re-import .open-next/worker.js after the
// `opennextjs-cloudflare build` step has produced it, then wrangler bundles
// this file and resolves the import. wrangler.jsonc `main` points here.
import * as Sentry from "@sentry/cloudflare";

import handler from "./.open-next/worker.js";

type CloudflareEnv = {
  SENTRY_DSN?: string;
  ENVIRONMENT?: string;
};

// Sentry attaches request.url and request.headers to events by default. The
// listen page carries an HMAC-signed delivery token in the URL path, the cron
// bearer secret rides in `cf-cron`, and Sanity preview / CF Access cookies are
// session-equivalent — none of those should be replayable from the issue tracker.
function scrubSensitiveRequestData(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const request = event.request;
  if (request?.headers && typeof request.headers === "object") {
    delete (request.headers as Record<string, unknown>).cookie;
    delete (request.headers as Record<string, unknown>)["cf-cron"];
    delete (request.headers as Record<string, unknown>).authorization;
  }
  if (request?.url) {
    request.url = request.url.replace(/\/listen\/[^/?#]+/, "/listen/[REDACTED]");
  }
  return event;
}

export default Sentry.withSentry(
  (env: CloudflareEnv) => ({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT ?? "local",
    // Errors-only posture for now. Tracing/profiling are paid features
    // on Sentry's free tier and out of scope for this PR.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubSensitiveRequestData,
  }),
  handler,
);

// OpenNext exports Durable Object handlers from .open-next/worker.js — wrangler
// requires them to be re-exported from the configured `main` file.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
