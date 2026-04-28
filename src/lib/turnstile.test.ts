import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstileToken } from "./turnstile";

const VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function mockFetchResponse(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(body),
  });
}

describe("verifyTurnstileToken", () => {
  it("returns true when Cloudflare confirms success", async () => {
    const fetchSpy = mockFetchResponse({ success: true });
    vi.stubGlobal("fetch", fetchSpy);

    expect(await verifyTurnstileToken("token-abc")).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      VERIFY_ENDPOINT,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns false when Cloudflare reports failure", async () => {
    vi.stubGlobal("fetch", mockFetchResponse({ success: false, "error-codes": ["invalid"] }));
    expect(await verifyTurnstileToken("bad-token")).toBe(false);
  });

  it("returns false when the verify request itself errors (non-2xx)", async () => {
    vi.stubGlobal("fetch", mockFetchResponse(null, false));
    expect(await verifyTurnstileToken("token")).toBe(false);
  });

  it("includes remoteip in the request when ip is provided", async () => {
    const fetchSpy = mockFetchResponse({ success: true });
    vi.stubGlobal("fetch", fetchSpy);

    await verifyTurnstileToken("token", "203.0.113.42");

    const body = fetchSpy.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("remoteip")).toBe("203.0.113.42");
  });

  it("rejects verification when TURNSTILE_SECRET_KEY is missing", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await verifyTurnstileToken("token")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
