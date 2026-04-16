import { describe, expect, it, vi } from "vitest";

// Shim NextResponse.next() — we only need the mutable .headers Map.
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
  }
  return {
    NextResponse: {
      next: () => new FakeResponse(),
    },
  };
});

import { DRAFT_COOKIE, middleware } from "../middleware";

function makeRequest({
  hasDraft,
  host = "withjosephine.com",
}: {
  hasDraft: boolean;
  host?: string;
}) {
  return {
    cookies: {
      has: (name: string) => hasDraft && name === DRAFT_COOKIE,
    },
    headers: {
      get: (name: string) => (name.toLowerCase() === "host" ? host : null),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

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
});
