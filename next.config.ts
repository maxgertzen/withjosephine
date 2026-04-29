import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudflare Workers cannot run the Next.js image optimization loader.
    // Static images are pre-optimized to WebP via `pnpm optimize-images` (sharp).
    unoptimized: true,
  },
  // Strip Next.js internals we don't ship to keep the worker under
  // Cloudflare's 3 MiB free-tier compressed limit. Each of these files is
  // pulled into the deploy artifact by Next's NFT tracer but never executes
  // in our build:
  //   - capsize-font-metrics.json (4.1 MiB) — only used if next/font
  //     deviates from a Google-fonts default. We use Cormorant + Inter via
  //     next/font/google, no custom metric loading.
  //   - turbo runtime variants — we don't use Turbopack
  //   - edge-runtime primitives — we deploy via Node.js runtime, not edge
  //   - compression — Cloudflare compresses at the edge
  outputFileTracingExcludes: {
    "*": [
      "**/next/dist/server/capsize-font-metrics.json",
      "**/next/dist/compiled/next-server/app-page-turbo*.runtime.prod.js",
      "**/next/dist/compiled/edge-runtime/**",
      "**/next/dist/compiled/@edge-runtime/**",
      "**/next/dist/compiled/compression/**",
      // OG image generation (next/og ImageResponse). We never call it
      // anywhere in src/. The wasm + edge runtime files alone are ~2.2 MiB.
      "**/next/dist/compiled/@vercel/og/**",
      "**/next/dist/server/og/**",
      // React DOM ships 5 server-render entry points; we only execute one
      // on the Worker. The legacy.* + browser variants are dead weight.
      "**/react-dom/cjs/react-dom-server-legacy.*",
      "**/react-dom/cjs/react-dom-server.browser.production.js",
      "**/react-dom/cjs/react-dom-server.bun.production.js",
    ],
  },
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
