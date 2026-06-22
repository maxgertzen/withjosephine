// @opennextjs/cloudflare configuration.
//
// Cache Components (next.config.ts) prerenders static shells + caches published
// Sanity reads. On Cloudflare that needs a persistent store + tag cache for
// on-demand revalidation (Workers Static Assets are read-only). Revalidation is
// driven by the Sanity publish webhook -> /api/sanity-revalidate.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: doShardedTagCache({ baseShardSize: 4 }),
  // "direct": revalidation runs inline; no durable queue DO needed since we
  // revalidate on-demand (Sanity webhook), not via time-based ISR.
  queue: "direct",
  // Must stay false with Cache Components / PPR (per OpenNext guidance).
  enableCacheInterception: false,
});
