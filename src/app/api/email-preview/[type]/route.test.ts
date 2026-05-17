// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/client", () => ({
  sanityClient: {
    withConfig: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(null),
    }),
  },
}));

beforeEach(() => {
  vi.stubEnv("SANITY_READ_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(opts: { url?: string; origin?: string; referer?: string }) {
  const headers = new Headers();
  if (opts.origin) headers.set("origin", opts.origin);
  if (opts.referer) headers.set("referer", opts.referer);
  return new Request(opts.url ?? "https://withjosephine.com/api/email-preview/emailMagicLink", {
    headers,
  });
}

describe("GET /api/email-preview/[type]", () => {
  it("returns 403 when origin and referer are missing", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({}), {
      params: Promise.resolve({ type: "emailMagicLink" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 403 when origin is not Studio", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ origin: "https://evil.example.com" }), {
      params: Promise.resolve({ type: "emailMagicLink" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 404 for unknown email template type", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({ origin: "https://withjosephine.sanity.studio" }),
      { params: Promise.resolve({ type: "emailDoesNotExist" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 200 with text/html when origin is Studio and type is valid", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({ origin: "https://withjosephine.sanity.studio" }),
      { params: Promise.resolve({ type: "emailMagicLink" }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.text();
    expect(body).toContain("<html");
  });

  it("accepts referer when origin header is absent", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({ referer: "https://withjosephine.sanity.studio/production/structure" }),
      { params: Promise.resolve({ type: "emailMagicLink" }) },
    );
    expect(response.status).toBe(200);
  });

  it("renders every known template type without throwing", async () => {
    const { GET } = await import("./route");
    const types = [
      "emailOrderConfirmation",
      "emailDay2Started",
      "emailDay7Delivery",
      "emailGiftPurchaseConfirmation",
      "emailGiftClaim",
      "emailMagicLink",
      "emailPrivacyExport",
    ];
    for (const type of types) {
      const response = await GET(
        makeRequest({ origin: "https://withjosephine.sanity.studio" }),
        { params: Promise.resolve({ type }) },
      );
      expect(response.status).toBe(200);
    }
  });
});
