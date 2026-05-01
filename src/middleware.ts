import { type NextRequest, NextResponse } from "next/server";

import { PRODUCTION_HOSTS } from "@/lib/constants";
import { isUnderConstruction } from "@/lib/featureFlags";
import { CONSENT_HEADER, requiresConsent } from "@/lib/region";

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

// Paths that must keep working on the production apex even when the holding
// page is on. Everything else gets rewritten to `/` so it serves the holding
// HTML. Rationale per entry:
//   - /api/stripe/webhook : Stripe POSTs server-to-server; redirecting it would
//                           drop events and silently break payment reconcile.
//   - /api/cron/          : Cloudflare cron triggers hit these on the apex.
//   - /listen/            : HMAC-tokenized delivery links sent in customer
//                           emails; the bodies hardcode apex URLs (see
//                           email-day-7-deliver/route.ts SITE_ORIGIN).
const APEX_ALLOWLIST_PREFIXES = ["/api/stripe/webhook", "/api/cron/", "/listen/"];

function isApexAllowlisted(pathname: string): boolean {
  if (pathname === "/") return true;
  return APEX_ALLOWLIST_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix,
  );
}

const isDev = process.env.NODE_ENV === "development";

// React requires eval() in development for callstack reconstruction.
// Never allow it in production.
const devEval = isDev ? " 'unsafe-eval'" : "";

const CSP_PUBLIC =
  "default-src 'self'; " +
  `script-src 'self' 'unsafe-inline'${devEval} https://challenges.cloudflare.com https://static.cloudflareinsights.com; ` +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' https://cdn.sanity.io https://images.withjosephine.com data: blob:; " +
  "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com https://*.ingest.de.sentry.io https://*.r2.cloudflarestorage.com https://images.withjosephine.com https://api-js.mixpanel.com https://api.mixpanel.com; " +
  "worker-src 'self' blob:; " +
  "frame-ancestors 'none'; " +
  "frame-src https://challenges.cloudflare.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "upgrade-insecure-requests";

const CSP_DRAFT =
  "default-src 'self'; " +
  `script-src 'self' 'unsafe-inline'${devEval} https://challenges.cloudflare.com https://static.cloudflareinsights.com; ` +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' https://cdn.sanity.io https://images.withjosephine.com data: blob:; " +
  "connect-src 'self' https://*.sanity.io wss://*.sanity.io https://*.sanity.studio https://challenges.cloudflare.com https://cloudflareinsights.com https://*.ingest.de.sentry.io https://*.r2.cloudflarestorage.com https://images.withjosephine.com https://api-js.mixpanel.com https://api.mixpanel.com; " +
  "worker-src 'self' blob:; " +
  "frame-ancestors 'self' https://*.sanity.studio https://*.sanity.io; " +
  "frame-src 'self' https://*.sanity.studio https://*.sanity.io https://challenges.cloudflare.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "upgrade-insecure-requests";

export function middleware(request: NextRequest) {
  const isDraft = request.cookies.has(DRAFT_COOKIE);
  // Any non-production host (e.g. preview.withjosephine.com, *.workers.dev)
  // must never be indexed — they leak duplicate content and damage launch-day
  // SEO on the apex. We treat anything other than the bare apex as "private".
  const host = request.headers.get("host") ?? "";
  const isPublicApex = PRODUCTION_HOSTS.includes(host);
  const { pathname } = request.nextUrl;

  // Apex lockdown: when under-construction is on, every apex path that isn't
  // allowlisted (Stripe webhook, crons, /listen/[token]) gets rewritten to `/`
  // so it serves the holding HTML. Draft mode bypasses this so Studio's
  // Presentation tool keeps working if it's ever pointed at apex (currently
  // it points at preview). Page-level gate in src/app/page.tsx still fires
  // for `/` itself — both layers must remain.
  if (
    isPublicApex &&
    !isDraft &&
    isUnderConstruction(host) &&
    !isApexAllowlisted(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.rewrite(url);
  }

  // Header set on the request (not response) so RSC reads it via headers().
  const country = request.headers.get("cf-ipcountry");
  const region = request.headers.get("cf-region");
  const requestHeaders = new Headers(request.headers);
  if (requiresConsent(country, region)) {
    requestHeaders.set(CONSENT_HEADER, "1");
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });

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

  if (pathname.startsWith("/api/") || !pathname.includes(".")) {
    console.log(
      JSON.stringify({
        type: "request",
        method: request.method,
        pathname,
        host,
        isDraft,
        isPublicApex,
        status: response.status,
      }),
    );
  }

  return response;
}

export const config = {
  // Apply to every page / route except Next internals and static assets.
  matcher: ["/((?!_next/|favicon\\.ico|apple-touch-icon\\.png|images/).*)"],
};
