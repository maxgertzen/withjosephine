import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/headers so draftMode() is controllable in tests.
const enableSpy = vi.fn();
const disableSpy = vi.fn();
vi.mock("next/headers", () => ({
  draftMode: vi.fn(async () => ({
    enable: enableSpy,
    disable: disableSpy,
    isEnabled: false,
  })),
}));

// next/navigation.redirect throws a sentinel (matching Next's actual runtime).
class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

// Minimal NextRequest/NextResponse shim — we only exercise URL parsing + status.
class FakeNextRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}
vi.mock("next/server", () => ({
  NextResponse: class {
    status: number;
    body: string;
    constructor(body: string, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
  },
}));

beforeEach(() => {
  enableSpy.mockReset();
  disableSpy.mockReset();
  process.env.SANITY_PREVIEW_SECRET = "test-secret";
});

afterEach(() => {
  delete process.env.SANITY_PREVIEW_SECRET;
});

describe("/api/draft/enable", () => {
  it("rejects requests with no secret (401)", async () => {
    const { GET } = await import("../enable/route");
    const req = new FakeNextRequest("https://example.com/api/draft/enable");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await GET(req as any)) as unknown as { status: number };
    expect(res.status).toBe(401);
    expect(enableSpy).not.toHaveBeenCalled();
  });

  it("rejects requests with wrong secret (401)", async () => {
    const { GET } = await import("../enable/route");
    const req = new FakeNextRequest(
      "https://example.com/api/draft/enable?secret=wrong",
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await GET(req as any)) as unknown as { status: number };
    expect(res.status).toBe(401);
    expect(enableSpy).not.toHaveBeenCalled();
  });

  it("enables draft mode + redirects to slug on valid secret", async () => {
    const { GET } = await import("../enable/route");
    const req = new FakeNextRequest(
      "https://example.com/api/draft/enable?secret=test-secret&slug=/book/soul-blueprint",
    );
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      GET(req as any),
    ).rejects.toMatchObject({ url: "/book/soul-blueprint" });
    expect(enableSpy).toHaveBeenCalledOnce();
  });

  it("defaults redirect to / when slug is omitted", async () => {
    const { GET } = await import("../enable/route");
    const req = new FakeNextRequest(
      "https://example.com/api/draft/enable?secret=test-secret",
    );
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      GET(req as any),
    ).rejects.toMatchObject({ url: "/" });
    expect(enableSpy).toHaveBeenCalledOnce();
  });

  it("refuses to redirect to an off-site URL (normalises to /<value>)", async () => {
    const { GET } = await import("../enable/route");
    const req = new FakeNextRequest(
      "https://example.com/api/draft/enable?secret=test-secret&slug=evil.com",
    );
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      GET(req as any),
    ).rejects.toMatchObject({ url: "/evil.com" });
  });

  it("accepts Sanity Presentation params (sanity-preview-secret + sanity-preview-pathname)", async () => {
    const { GET } = await import("../enable/route");
    const req = new FakeNextRequest(
      "https://example.com/api/draft/enable?sanity-preview-secret=test-secret&sanity-preview-perspective=drafts&sanity-preview-pathname=%2Fbook%2Fbirth-chart",
    );
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      GET(req as any),
    ).rejects.toMatchObject({ url: "/book/birth-chart" });
    expect(enableSpy).toHaveBeenCalledOnce();
  });

  it("rejects Sanity Presentation request with wrong sanity-preview-secret (401)", async () => {
    const { GET } = await import("../enable/route");
    const req = new FakeNextRequest(
      "https://example.com/api/draft/enable?sanity-preview-secret=wrong&sanity-preview-pathname=%2F",
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await GET(req as any)) as unknown as { status: number };
    expect(res.status).toBe(401);
    expect(enableSpy).not.toHaveBeenCalled();
  });
});

describe("/api/draft/disable", () => {
  it("disables draft mode and redirects to /", async () => {
    const { GET } = await import("../disable/route");
    await expect(GET()).rejects.toMatchObject({ url: "/" });
    expect(disableSpy).toHaveBeenCalledOnce();
  });
});
