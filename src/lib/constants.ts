export const CONTACT_EMAIL = "hello@withjosephine.com";

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
 * Origin where R2-hosted booking photos are served from. Per-env via
 * NEXT_PUBLIC_R2_PUBLIC_HOST (prod: images.withjosephine.com, staging:
 * staging-images.withjosephine.com). Default-fallback is the prod host so a
 * missing GH variable fails to prod-safe behavior; the runtime startup
 * assertion in src/lib/booking/envAssertions.ts catches the
 * staging-with-prod-host misconfig on the first booking-api request.
 */
export const R2_PUBLIC_ORIGIN = `https://${process.env.NEXT_PUBLIC_R2_PUBLIC_HOST ?? "images.withjosephine.com"}`;

export const ROUTES = {
  home: "/",
  privacy: "/privacy",
  terms: "/terms",
  refundPolicy: "/refund-policy",
} as const;
