import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudflare Workers cannot run the Next.js image optimization loader.
    // Static images are pre-optimized to WebP via `pnpm optimize-images` (sharp).
    unoptimized: true,
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
