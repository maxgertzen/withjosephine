export const CONTACT_EMAIL = "hello@withjosephine.com";

export const NONCE_HEADER = "x-nonce";

/**
 * Hosts that count as the live production site. Anything else (preview
 * subdomains, *.workers.dev URLs, localhost) is treated as private and gets
 * `X-Robots-Tag: noindex` from the edge middleware.
 */
export const PRODUCTION_HOSTS: ReadonlyArray<string> = [
  "withjosephine.com",
  "www.withjosephine.com",
];

/**
 * Maps a `window.location.host` to a coarse environment label used by
 * Mixpanel and Sentry to tag events. Mirrors the server-side equivalent in
 * `src/lib/analytics/server.ts` (which reads from `ENVIRONMENT` instead).
 */
export function deriveEnvironmentFromHost(host: string) {
  if (PRODUCTION_HOSTS.includes(host)) return "production";
  if (host.startsWith("preview.")) return "preview";
  if (host.endsWith(".workers.dev")) return "workers-dev";
  return "local";
}

/**
 * Origin where R2-hosted booking photos are served from. Per-env via
 * `NEXT_PUBLIC_R2_PUBLIC_HOST`: prod / staging GH Environment variables for
 * deploys, repo-level for non-deploy CI jobs, `.env.local` for local dev,
 * `vitest.config.ts` `test.env` for tests. The literal `process.env.NEXT_PUBLIC_*`
 * access here is required for Next's build-time inlining; throwing on missing
 * value forces every environment to declare it explicitly instead of leaning
 * on a hardcoded default that would drift if the host ever changes.
 */
const r2PublicHost = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;
if (!r2PublicHost) {
  throw new Error(
    "NEXT_PUBLIC_R2_PUBLIC_HOST is required — set it in your GH Environment / repo variables, .env.local, or vitest config",
  );
}
export const R2_PUBLIC_ORIGIN = `https://${r2PublicHost}`;

export const ROUTES = {
  home: "/",
  privacy: "/privacy",
  terms: "/terms",
  refundPolicy: "/refund-policy",
} as const;
