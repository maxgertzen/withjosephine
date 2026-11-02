import { TIKTOK_PLAYER_ORIGIN } from "@/lib/links/tiktokVideo";
export const CONTACT_EMAIL = "hello@withjosephine.com";

export const NONCE_HEADER = "x-nonce";

export const SITE_DOMAIN = "withjosephine.com";
export const MAIN_SITE_ORIGIN = `https://${SITE_DOMAIN}`;
export const MAIN_SITE_HOSTS: ReadonlyArray<string> = [SITE_DOMAIN, `www.${SITE_DOMAIN}`];
export const LINKS_HOST = `links.${SITE_DOMAIN}`;
export const LINKS_PAGE_ORIGIN = `https://${LINKS_HOST}`;

/**
 * Hosts that count as the live production site. Anything else (preview
 * subdomains, *.workers.dev URLs, localhost) is treated as private and gets
 * `X-Robots-Tag: noindex` from the edge middleware.
 */
export const PRODUCTION_HOSTS: ReadonlyArray<string> = [...MAIN_SITE_HOSTS, LINKS_HOST];

export function sharesSiteCookies(hostname: string): boolean {
  return PRODUCTION_HOSTS.includes(hostname);
}

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
  notes: "/notes",
  tt: "/tt",
} as const;

/**
 * Fully-static (`○`) content routes: they have no per-request nonce, so their
 * CSP must admit Next's inline bootstrap via `script-src 'unsafe-inline'`.
 * Dynamic (`ƒ`) routes carry the per-request nonce instead and
 * MUST NOT appear here — a force-dynamic route listed here silently drops to the
 * weaker unsafe-inline policy (which is what happened when #326 flipped the legal
 * pages to force-dynamic without updating this set). `staticCspPaths.test.ts`
 * enforces the invariant.
 */
export const STATIC_CSP_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/under-construction",
  ROUTES.notes,
  ROUTES.tt,
]);

// Prerendered slug routes, which an exact-match Set cannot express. `/book/<slug>`
// HTML is replayed from the R2 cache, so a nonce baked into it never equals the
// fresh response nonce: a nonce-only policy would block hydration entirely.
const STATIC_CSP_PATTERNS: readonly RegExp[] = [/^\/book\/[^/]+$/, /^\/notes\/[^/]+$/];

export function isStaticCspPath(pathname: string): boolean {
  return STATIC_CSP_PATHS.has(pathname) || STATIC_CSP_PATTERNS.some((re) => re.test(pathname));
}

const CSP_EXTRA_FRAME_SOURCES: ReadonlyMap<string, readonly string[]> = new Map([
  [ROUTES.tt, [TIKTOK_PLAYER_ORIGIN]],
  [`/preview${ROUTES.tt}`, [TIKTOK_PLAYER_ORIGIN]],
]);

export function cspExtraFrameSources(pathname: string): readonly string[] {
  return CSP_EXTRA_FRAME_SOURCES.get(pathname) ?? [];
}

export const PRIVATE_LINK_PREFIXES = ["/gift/", "/thank-you/"] as const;

export function isPrivateLinkPath(pathname: string): boolean {
  return PRIVATE_LINK_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
