import { withSentryConfig } from "@sentry/nextjs";
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
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "greatwhale-solutions-limited",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});

// Cloudflare Workers runtime wiring:
// `pnpm cf:build` bundles the app via @opennextjs/cloudflare.
// `pnpm cf:deploy` publishes to the single Cloudflare Pages project.
// Local-emulated preview uses `pnpm cf:preview` (wrangler pages dev).
// See docs/PHASE10_CLOUDFLARE_SETUP.md.
