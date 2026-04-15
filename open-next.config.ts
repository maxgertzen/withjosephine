// @opennextjs/cloudflare configuration.
//
// Minimal setup: no incremental cache (the site has ~14 pages and rebuilds in
// ~2s, so the R2 incremental-cache override would add ops cost without
// meaningful wins). Add an override here if that changes.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
