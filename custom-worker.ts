// Wraps the OpenNext-generated worker fetch handler with Sentry error capture
// AND adds a `scheduled` handler so wrangler cron triggers dispatch internally
// instead of needing external Bearer-authenticated curl invocations.
// OpenNext's customWorker pattern: re-import .open-next/worker.js after the
// `opennextjs-cloudflare build` step has produced it, then wrangler bundles
// this file and resolves the import. wrangler.jsonc `main` points here.
import * as Sentry from "@sentry/cloudflare";

import handler from "./.open-next/worker.js";
import { dispatchPathsForCron } from "./src/lib/cron-routes";

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

// `scheduled` handler dispatches the wrangler cron triggers into internal
// fetches against /api/cron/* routes. The `cf-cron` header satisfies
// `isCronRequestAuthorized` without leaking CRON_SECRET into the dispatch
// path (CF only sets that header on actual scheduled invocations, not on
// public requests). Origin is per-env so request logs are correctly
// attributed; pathname is what Next routes on.
function originForEnv(env: CloudflareEnv): string {
  return env.ENVIRONMENT === "staging"
    ? "https://staging.withjosephine.com"
    : "https://withjosephine.com";
}

const composedHandler: ExportedHandler<CloudflareEnv> = {
  fetch: handler.fetch,
  async scheduled(event, env, ctx) {
    const paths = dispatchPathsForCron(event.cron);
    if (paths.length === 0) {
      console.warn(`[scheduled] no routes mapped for cron "${event.cron}"`);
      return;
    }
    const origin = originForEnv(env);
    const dispatch = paths.map(async (path) => {
      const req = new Request(`${origin}${path}`, {
        method: "POST",
        headers: { "cf-cron": "1" },
      });
      const res = await handler.fetch!(req, env, ctx);
      console.log(`[scheduled] ${event.cron} → ${path} → ${res.status}`);
    });
    await Promise.allSettled(dispatch);
  },
};

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
  composedHandler,
);

// OpenNext exports Durable Object handlers from .open-next/worker.js — wrangler
// requires them to be re-exported from the configured `main` file.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
export { GiftClaimScheduler } from "./src/lib/durable-objects/GiftClaimScheduler";
