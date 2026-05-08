import { beforeEach, describe, expect, it, vi } from "vitest";

// Shim NextResponse.next()/rewrite() — we only need .headers and .rewriteTo for assertions.
vi.mock("next/server", () => {
  class FakeHeaders {
    private store = new Map<string, string>();
    set(k: string, v: string) {
      this.store.set(k.toLowerCase(), v);
    }
    get(k: string) {
      return this.store.get(k.toLowerCase()) ?? null;
    }
    has(k: string) {
      return this.store.has(k.toLowerCase());
    }
  }
  class FakeResponse {
    headers = new FakeHeaders();
    rewriteTo: string | null = null;
  }
  return {
    NextResponse: {
      next: () => new FakeResponse(),
      rewrite: (url: URL) => {
        const r = new FakeResponse();
        r.rewriteTo = url.pathname;
        return r;
      },
    },
  };
});

import type { NextRequest } from "next/server";

import { DRAFT_COOKIE, middleware } from "../middleware";

function makeRequest({
  hasDraft,
  host = "withjosephine.com",
  pathname = "/",
}: {
  hasDraft: boolean;
  host?: string;
  pathname?: string;
}) {
  return {
    cookies: {
      has: (name: string) => hasDraft && name === DRAFT_COOKIE,
    },
    headers: {
      get: (name: string) => (name.toLowerCase() === "host" ? host : null),
    },
    nextUrl: {
      pathname,
      clone: () => ({ pathname }),
    },
    method: "GET",
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "");
});

describe("middleware CSP + draft hardening", () => {
  it("public request on apex gets strict CSP and no Cache-Control/noindex", () => {
    const res = middleware(makeRequest({ hasDraft: false, host: "withjosephine.com" }));
    const csp = res.headers.get("content-security-policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("sanity.studio");
    expect(res.headers.has("cache-control")).toBe(false);
    expect(res.headers.has("x-robots-tag")).toBe(false);
  });

  it("public request on www apex gets no noindex either", () => {
    const res = middleware(makeRequest({ hasDraft: false, host: "www.withjosephine.com" }));
    expect(res.headers.has("x-robots-tag")).toBe(false);
  });

  it("public request on preview subdomain gets noindex AND Studio-friendly CSP", () => {
    const res = middleware(makeRequest({ hasDraft: false, host: "preview.withjosephine.com" }));
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    // CSP must allow the Studio iframe even before draft mode is enabled —
    // the Presentation tool iframes the host first, then triggers /api/draft/enable.
    // Sanity now hosts Presentation at www.sanity.io (not just *.sanity.studio),
    // so both origins must be allowed as frame-ancestors.
    const csp = res.headers.get("content-security-policy");
    expect(csp).toContain("frame-ancestors 'self' https://*.sanity.studio https://*.sanity.io");
    expect(csp).not.toContain("frame-ancestors 'none'");
  });

  it("public request on workers.dev URL gets noindex AND Studio-friendly CSP", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, host: "withjosephine.user.workers.dev" }),
    );
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'self' https://*.sanity.studio https://*.sanity.io",
    );
  });

  it("draft request gets relaxed CSP, no-store cache, and noindex", () => {
    const res = middleware(makeRequest({ hasDraft: true, host: "preview.withjosephine.com" }));
    const csp = res.headers.get("content-security-policy");
    expect(csp).toContain("frame-ancestors 'self' https://*.sanity.studio https://*.sanity.io");
    expect(csp).toContain("frame-src 'self' https://*.sanity.studio https://*.sanity.io");
    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("CSP allows Microsoft Clarity origins for script-src and connect-src", () => {
    const apex = middleware(makeRequest({ hasDraft: false, host: "withjosephine.com" }));
    const csp = apex.headers.get("content-security-policy") ?? "";
    const scriptDirective = csp.split(";").find((d) => d.trim().startsWith("script-src"));
    const connectDirective = csp.split(";").find((d) => d.trim().startsWith("connect-src"));
    // Wildcard (*.clarity.ms) covers www.clarity.ms entry + collection subdomains.
    // c.bing.com is Microsoft's beacon endpoint Clarity routes telemetry through;
    // both directives need it per the docs (script-src for the snippet that calls
    // it, connect-src for the actual fetch).
    expect(scriptDirective).toContain("https://*.clarity.ms");
    expect(scriptDirective).toContain("https://c.bing.com");
    expect(connectDirective).toContain("https://*.clarity.ms");
    expect(connectDirective).toContain("https://c.bing.com");
  });

  it("CSP img-src allows clarity.ms so the Clarity tracking pixel (c.gif) can load", () => {
    const apex = middleware(makeRequest({ hasDraft: false, host: "withjosephine.com" }));
    const csp = apex.headers.get("content-security-policy") ?? "";
    const imgDirective = csp.split(";").find((d) => d.trim().startsWith("img-src"));
    expect(imgDirective).toContain("https://*.clarity.ms");
  });
});

type RewriteResponse = { rewriteTo: string | null };

describe("middleware apex lockdown (under-construction on)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "1");
  });

  it("rewrites apex booking flow to / so it serves the holding page", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, pathname: "/book/soul-blueprint/intake" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBe("/");
  });

  it("rewrites apex thank-you, contact, draft-mode, booking API to /", () => {
    const paths = [
      "/thank-you/abc123",
      "/api/contact",
      "/api/booking",
      "/api/booking/upload-url",
      "/api/draft/enable",
      "/privacy",
      "/terms",
      "/refund-policy",
    ];
    for (const pathname of paths) {
      const res = middleware(
        makeRequest({ hasDraft: false, pathname }),
      ) as unknown as RewriteResponse;
      expect(res.rewriteTo, `expected ${pathname} to be rewritten`).toBe("/");
    }
  });

  it("does NOT rewrite Stripe webhook on apex (server-to-server must work)", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, pathname: "/api/stripe/webhook" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBeNull();
  });

  it("does NOT rewrite cron endpoints on apex (CF cron triggers must work)", () => {
    const paths = [
      "/api/cron/reconcile",
      "/api/cron/cleanup",
      "/api/cron/email-day-2",
      "/api/cron/email-day-7",
      "/api/cron/email-day-7-deliver",
    ];
    for (const pathname of paths) {
      const res = middleware(
        makeRequest({ hasDraft: false, pathname }),
      ) as unknown as RewriteResponse;
      expect(res.rewriteTo, `expected ${pathname} not to be rewritten`).toBeNull();
    }
  });

  it("does NOT rewrite /listen/[token] on apex (delivery emails hardcode apex URLs)", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, pathname: "/listen/c3ViXzE.deadbeef" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBeNull();
  });

  it("does NOT rewrite on preview subdomain (preview is the working surface)", () => {
    const res = middleware(
      makeRequest({
        hasDraft: false,
        host: "preview.withjosephine.com",
        pathname: "/book/soul-blueprint/intake",
      }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBeNull();
  });

  it("does NOT rewrite when draft mode is on (Studio Presentation must reach real routes)", () => {
    const res = middleware(
      makeRequest({ hasDraft: true, pathname: "/book/soul-blueprint/intake" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBeNull();
  });

  it("leaves `/` itself alone — page-level gate handles holding-page render", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, pathname: "/" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBeNull();
  });
});
