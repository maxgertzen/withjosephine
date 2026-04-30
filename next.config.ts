import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudflare Workers cannot run the Next.js image optimization loader.
    // Static images are pre-optimized to WebP via `pnpm optimize-images` (sharp).
    unoptimized: true,
  },
  // `outputFileTracingExcludes` deliberately absent. Any non-empty value
  // makes Next 16.2.x + OpenNext 1.19.4 + workerd duplicate
  // `AsyncLocalStorage`, so per-request workStore is never initialized and
  // every server render throws `InvariantError: Expected workStore to be
  // initialized`. See docs/POST_LAUNCH_BACKLOG.md "Apex + preview 500" for
  // the bisect log and the bundle-size narrowing follow-up.
};

// Sentry config (withSentryConfig wrapper) was causing the worker bundle
// to bloat from 11 MiB to 16 MiB on CI because SENTRY_AUTH_TOKEN flips
// Sentry into full instrumentation mode (per-file source-map metadata,
// debug IDs, etc.). Worker exceeded the 3 MiB free-tier limit. Disabled
// for now — error tracking on the booking flow is "nice-to-have" and is
// captured in POST_LAUNCH_BACKLOG.md as a Phase 1.5 follow-up
// (lighter @sentry/cloudflare integration, or upgrade to a paid plan).
export default nextConfig;

// Cloudflare Workers runtime wiring:
// `pnpm cf:build` bundles the app via @opennextjs/cloudflare.
// `pnpm cf:deploy` publishes to the single Cloudflare Pages project.
// Local-emulated preview uses `pnpm cf:preview` (wrangler pages dev).
// See docs/PHASE10_CLOUDFLARE_SETUP.md.
