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
} as const;

/**
 * Fully-static (`○`) content routes: they have no per-request nonce, so their
 * CSP must admit Next's inline bootstrap via `script-src 'unsafe-inline'`.
 * Dynamic (`ƒ`) and SSG (`●`) routes carry the per-request nonce instead and
 * MUST NOT appear here — a force-dynamic route listed here silently drops to the
 * weaker unsafe-inline policy (which is what happened when #326 flipped the legal
 * pages to force-dynamic without updating this set). `staticCspPaths.test.ts`
 * enforces the invariant.
 */
export const STATIC_CSP_PATHS: ReadonlySet<string> = new Set(["/", "/under-construction"]);
