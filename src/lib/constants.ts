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

export const ROUTES = {
  home: "/",
  privacy: "/privacy",
  terms: "/terms",
  refundPolicy: "/refund-policy",
  library: "/my-readings",
} as const;
