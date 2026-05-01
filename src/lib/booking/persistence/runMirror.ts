import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Schedule a fire-and-forget mirror Promise so it survives Cloudflare Workers'
 * response-driven teardown.
 *
 * Without `ctx.waitUntil`, any in-flight `fetch` (e.g. the Sanity SDK's HTTPS
 * to api.sanity.io) is aborted the moment the request handler returns — we
 * observed this in prod: D1 row landed `paid`, Sanity stayed empty, and no
 * `[sanityMirror]` line ever appeared in `wrangler tail` because the request
 * was severed before the SDK could reach a `try/catch`.
 *
 * In non-Workers environments (vitest, `next dev` legacy paths) the CF context
 * is unreachable; we fall back to detaching the promise so today's
 * fire-and-forget tests keep their microtask-flushing semantics.
 */
export function runMirror(promise: Promise<void>): void {
  try {
    const ctx = getCloudflareContext().ctx;
    if (ctx?.waitUntil) {
      ctx.waitUntil(promise);
      return;
    }
  } catch {
    // No CF request context — fall through to inline detached execution.
  }
  void promise.catch(() => {
    // Each mirror function logs its own errors; swallow here to avoid
    // unhandled-rejection noise in non-Workers contexts.
  });
}
