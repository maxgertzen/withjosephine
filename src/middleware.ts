import { NextResponse, type NextRequest } from "next/server";
import { PRODUCTION_HOSTS } from "@/lib/constants";

/**
 * Edge middleware owns the Content-Security-Policy header because it has to
 * adapt to whether the current request is in Sanity draft mode (which needs
 * to be iframed by Studio's Presentation tool) or is normal public traffic.
 *
 * - Public apex (production) → strict CSP (matches previous `_headers` policy)
 * - Preview host or draft    → relaxed CSP permitting Sanity Studio as
 *                              frame-ancestor. Preview hosts (workers.dev,
 *                              preview subdomain) need this even before draft
 *                              mode is enabled, because Studio's Presentation
 *                              tool iframes the host first, then triggers
 *                              `/api/draft/enable` from inside the iframe.
 * - Draft request            → also adds `Cache-Control: no-store` +
 *                              `X-Robots-Tag: noindex` so the edge never
 *                              caches drafts and bots never index a draft
 *                              response.
 *
 * The static `public/_headers` keeps the headers that are identical for every
 * request (X-Content-Type-Options, Referrer-Policy, Permissions-Policy,
 * COOP/CORP). CSP lives here because it is not.
 */
export const DRAFT_COOKIE = "__prerender_bypass";

const CSP_PUBLIC =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://hcaptcha.com https://*.hcaptcha.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' https://cdn.sanity.io data:; " +
  "connect-src 'self' https://api.web3forms.com https://hcaptcha.com https://*.hcaptcha.com; " +
  "frame-ancestors 'none'; " +
  "frame-src https://hcaptcha.com https://*.hcaptcha.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self' https://api.web3forms.com; " +
  "upgrade-insecure-requests";

const CSP_DRAFT =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://hcaptcha.com https://*.hcaptcha.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' https://cdn.sanity.io data:; " +
  "connect-src 'self' https://*.sanity.io wss://*.sanity.io https://*.sanity.studio https://api.web3forms.com https://hcaptcha.com https://*.hcaptcha.com; " +
  "frame-ancestors 'self' https://*.sanity.studio https://*.sanity.io; " +
  "frame-src 'self' https://*.sanity.studio https://*.sanity.io https://hcaptcha.com https://*.hcaptcha.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self' https://api.web3forms.com; " +
  "upgrade-insecure-requests";

export function middleware(request: NextRequest) {
  const isDraft = request.cookies.has(DRAFT_COOKIE);
  // Any non-production host (e.g. preview.withjosephine.com, *.workers.dev)
  // must never be indexed — they leak duplicate content and damage launch-day
  // SEO on the apex. We treat anything other than the bare apex as "private".
  const host = request.headers.get("host") ?? "";
  const isPublicApex = PRODUCTION_HOSTS.includes(host);
  const response = NextResponse.next();

  // Strict CSP only on the public apex without draft mode. Anywhere else
  // (preview/workers.dev hosts, draft cookie) needs Studio as a valid
  // frame-ancestor for the Presentation tool's iframe to load at all.
  const isStrict = isPublicApex && !isDraft;
  response.headers.set("Content-Security-Policy", isStrict ? CSP_PUBLIC : CSP_DRAFT);

  if (isDraft) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (!isPublicApex) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  // Apply to every page / route except Next internals and static assets.
  matcher: ["/((?!_next/|favicon\\.ico|apple-touch-icon\\.png|images/).*)"],
};
