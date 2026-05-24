// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validatePreviewUrlMock = vi.fn();

vi.mock("@sanity/preview-url-secret", () => ({
  validatePreviewUrl: validatePreviewUrlMock,
}));

vi.mock("@/lib/sanity/client", () => ({
  sanityClient: {
    withConfig: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(null),
    }),
  },
}));

beforeEach(() => {
  vi.stubEnv("SANITY_READ_TOKEN", "test-token");
  validatePreviewUrlMock.mockReset().mockResolvedValue({ isValid: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const VALID_SECRET_QS = "?sanity-preview-secret=mock-secret";

function makeRequest(opts: { url?: string; origin?: string; referer?: string; noSecret?: boolean }) {
  const headers = new Headers();
  if (opts.origin) headers.set("origin", opts.origin);
  if (opts.referer) headers.set("referer", opts.referer);
  const url =
    opts.url ??
    `https://withjosephine.com/api/email-preview/emailMagicLink${opts.noSecret ? "" : VALID_SECRET_QS}`;
  return new Request(url, { headers });
}

describe("GET /api/email-preview/[type]", () => {
  it("returns 404 for unknown email template type", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({}), {
      params: Promise.resolve({ type: "emailDoesNotExist" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 200 with text/html when secret is valid", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({}), {
      params: Promise.resolve({ type: "emailMagicLink" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.text();
    expect(body).toContain("<html");
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
      "emailRecipientIntakeReceived",
    ];
    for (const type of types) {
      const url = `https://withjosephine.com/api/email-preview/${type}${VALID_SECRET_QS}`;
      const response = await GET(
        makeRequest({ origin: "https://withjosephine.sanity.studio", url }),
        { params: Promise.resolve({ type }) },
      );
      expect(response.status).toBe(200);
    }
  });

  it("returns 503 with token-missing header when SANITY_READ_TOKEN is unset", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("SANITY_READ_TOKEN", "");
    vi.resetModules();
    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({ origin: "https://withjosephine.sanity.studio" }),
      { params: Promise.resolve({ type: "emailMagicLink" }) },
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("x-preview-reason")).toBe("token-missing");
  });

  it("returns 403 with invalid-secret reason when preview secret is missing", async () => {
    validatePreviewUrlMock.mockResolvedValueOnce({ isValid: false });
    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({ origin: "https://withjosephine.sanity.studio", noSecret: true }),
      { params: Promise.resolve({ type: "emailMagicLink" }) },
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("x-preview-reason")).toBe("invalid-secret");
  });

  it("returns 403 with invalid-secret reason when preview secret is rejected by Sanity", async () => {
    validatePreviewUrlMock.mockResolvedValueOnce({ isValid: false });
    const { GET } = await import("./route");
    const response = await GET(
      makeRequest({ origin: "https://withjosephine.sanity.studio" }),
      { params: Promise.resolve({ type: "emailMagicLink" }) },
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("x-preview-reason")).toBe("invalid-secret");
  });
});
