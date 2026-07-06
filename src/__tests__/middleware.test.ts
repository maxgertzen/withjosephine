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
    cookieStore = new Map<string, string>();
    cookies = { set: (k: string, v: string) => this.cookieStore.set(k, v) };
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
  country = null,
}: {
  hasDraft: boolean;
  host?: string;
  pathname?: string;
  country?: string | null;
}) {
  return {
    cookies: {
      has: (name: string) => hasDraft && name === DRAFT_COOKIE,
    },
    headers: {
      get: (name: string) => {
        const n = name.toLowerCase();
        if (n === "host") return host;
        if (n === "cf-ipcountry") return country;
        return null;
      },
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

  function scriptSrcOf(res: { headers: { get(name: string): string | null } }): string {
    const csp = res.headers.get("content-security-policy") ?? "";
    return csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
  }

  it("static content routes get 'unsafe-inline' script-src and no nonce (prerender)", () => {
    for (const pathname of ["/", "/privacy", "/terms", "/refund-policy", "/under-construction"]) {
      const res = middleware(makeRequest({ hasDraft: false, host: "withjosephine.com", pathname }));
      const scriptDirective = scriptSrcOf(res);
      expect(scriptDirective, pathname).toContain("'unsafe-inline'");
      expect(scriptDirective, pathname).not.toContain("'nonce-");
    }
  });

  it("interactive routes keep the strict nonce and never get 'unsafe-inline'", () => {
    for (const pathname of ["/book/soul-blueprint/intake", "/listen/sub_1", "/auth/verify"]) {
      const res = middleware(makeRequest({ hasDraft: false, host: "withjosephine.com", pathname }));
      const scriptDirective = scriptSrcOf(res);
      expect(scriptDirective, pathname).toContain("'nonce-");
      expect(scriptDirective, pathname).not.toContain("'unsafe-inline'");
    }
  });

  it("sets the consent-required cookie to '0' for non-consent regions", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, host: "withjosephine.com", country: "US" }),
    ) as unknown as { cookieStore: Map<string, string> };
    expect(res.cookieStore.get("consent-required")).toBe("0");
  });

  it("fails closed: consent-required cookie is '1' when country is unknown", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, host: "withjosephine.com" }),
    ) as unknown as { cookieStore: Map<string, string> };
    expect(res.cookieStore.get("consent-required")).toBe("1");
  });

  it("sets the consent-required cookie to '1' for GDPR-aligned regions", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, host: "withjosephine.com", country: "DE" }),
    ) as unknown as { cookieStore: Map<string, string> };
    expect(res.cookieStore.get("consent-required")).toBe("1");
  });
});

type RewriteResponse = { rewriteTo: string | null };

describe("middleware apex lockdown (under-construction on)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "1");
  });

  it("rewrites apex booking flow to /under-construction so it serves the holding page", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, pathname: "/book/soul-blueprint/intake" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBe("/under-construction");
  });

  it("rewrites apex thank-you, contact, draft-mode, booking API to /under-construction", () => {
    const paths = [
      "/thank-you/abc123",
      "/api/contact",
      "/api/booking",
      "/api/booking/upload-url",
      "/api/draft/enable",
    ];
    for (const pathname of paths) {
      const res = middleware(
        makeRequest({ hasDraft: false, pathname }),
      ) as unknown as RewriteResponse;
      expect(res.rewriteTo, `expected ${pathname} to be rewritten`).toBe("/under-construction");
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

  it("does NOT rewrite /listen/[id] on apex (delivery emails hardcode apex URLs)", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, pathname: "/listen/sub_abc123" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBeNull();
  });

  it("does NOT rewrite legal pages on apex (statutory compliance reachability)", () => {
    const paths = ["/privacy", "/terms", "/refund-policy"];
    for (const pathname of paths) {
      const res = middleware(
        makeRequest({ hasDraft: false, pathname }),
      ) as unknown as RewriteResponse;
      expect(res.rewriteTo, `expected ${pathname} not to be rewritten`).toBeNull();
    }
  });

  it("does NOT rewrite /api/internal/ on apex (DO alarm dispatch + admin recovery scripts must reach apex)", () => {
    // Without this, GiftClaimScheduler.alarm()'s public-HTTPS POST to
    // /api/internal/gift-claim-dispatch would be rewritten to / during
    // soft-launch, silently dropping every scheduled-mode claim email.
    // gift-claim-regenerate (admin recovery script) has the same constraint.
    const paths = [
      "/api/internal/gift-claim-dispatch",
      "/api/internal/gift-claim-regenerate",
    ];
    for (const pathname of paths) {
      const res = middleware(
        makeRequest({ hasDraft: false, pathname }),
      ) as unknown as RewriteResponse;
      expect(res.rewriteTo, `expected ${pathname} not to be rewritten`).toBeNull();
    }
  });

  it("does NOT rewrite /api/admin/ on apex (Studio doc-action POSTs must reach apex during soft-launch)", () => {
    const paths = [
      "/api/admin/delete-user",
      "/api/admin/regenerate-gift-claim",
    ];
    for (const pathname of paths) {
      const res = middleware(
        makeRequest({ hasDraft: false, pathname }),
      ) as unknown as RewriteResponse;
      expect(res.rewriteTo, `expected ${pathname} not to be rewritten`).toBeNull();
    }
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

  it("rewrites `/` itself to /under-construction (it is the static landing now, not allowlisted)", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, pathname: "/" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBe("/under-construction");
  });

  it("does NOT rewrite /under-construction itself (avoids an infinite rewrite loop)", () => {
    const res = middleware(
      makeRequest({ hasDraft: false, pathname: "/under-construction" }),
    ) as unknown as RewriteResponse;
    expect(res.rewriteTo).toBeNull();
  });
});
