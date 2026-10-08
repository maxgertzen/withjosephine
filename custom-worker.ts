// Wraps the OpenNext-generated worker fetch handler with Sentry error capture
// AND adds a `scheduled` handler so wrangler cron triggers dispatch internally.
// OpenNext's customWorker pattern: re-import .open-next/worker.js after the
// `opennextjs-cloudflare build` step has produced it, then wrangler bundles
// this file and resolves the import. wrangler.jsonc `main` points here.
import * as Sentry from "@sentry/cloudflare";

import handler from "./.open-next/worker.js";
import { scheduledCronRequest } from "./src/lib/booking/cron-auth";
import { dispatchPathsForCron } from "./src/lib/cron-routes";
import { scrubBreadcrumb, scrubSentryRequest } from "./src/lib/logging/redactSearchParams";

type CloudflareEnv = {
  SENTRY_DSN?: string;
  ENVIRONMENT?: string;
  CRON_SECRET?: string;
};

function scrubSensitiveRequestData(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  scrubSentryRequest(event.request);
  return event;
}

function originForEnv(env: CloudflareEnv): string {
  return env.ENVIRONMENT === "staging"
    ? "https://staging.withjosephine.com"
    : "https://withjosephine.com";
}

// Sentry free tier = 1 cron monitor; scoped to the paid-fulfilment path.
const DELIVER_REQUESTED_PATH = "/api/cron/deliver-requested";
const DELIVERY_MONITOR_SLUG = "email-day-7-deliver";

const composedHandler: ExportedHandler<CloudflareEnv> = {
  fetch: handler.fetch,
  async scheduled(event, env, ctx) {
    const paths = dispatchPathsForCron(event.cron);
    if (paths.length === 0) {
      console.warn(`[scheduled] no routes mapped for cron "${event.cron}"`);
      return;
    }
    const cronSecret = env.CRON_SECRET;
    if (!cronSecret) {
      console.error(`[scheduled] CRON_SECRET is not set; "${event.cron}" not dispatched`);
      return;
    }
    const origin = originForEnv(env);
    const dispatch = paths.map(async (path) => {
      const sendCronRequest = async () => {
        const res = await handler.fetch!(scheduledCronRequest(`${origin}${path}`, cronSecret), env, ctx);
        console.log(`[scheduled] ${event.cron} → ${path} → ${res.status}`);
        return res;
      };
      if (path === DELIVER_REQUESTED_PATH) {
        await Sentry.withMonitor(
          DELIVERY_MONITOR_SLUG,
          async () => {
            const res = await sendCronRequest();
            if (!res.ok) {
              throw new Error(`cron ${path} returned ${res.status}`);
            }
          },
          { schedule: { type: "crontab", value: event.cron } },
        );
        return;
      }
      await sendCronRequest();
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
    beforeBreadcrumb: scrubBreadcrumb,
  }),
  composedHandler,
);

// OpenNext exports Durable Object handlers from .open-next/worker.js — wrangler
// requires them to be re-exported from the configured `main` file.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
