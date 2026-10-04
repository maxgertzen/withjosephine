import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCloudflareContextMock = vi.fn();

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: getCloudflareContextMock,
}));

beforeEach(() => {
  vi.resetModules();
  getCloudflareContextMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("checkRateLimit", () => {
  it("returns true when CF context is unavailable (local dev / tests)", async () => {
    getCloudflareContextMock.mockImplementation(() => {
      throw new Error("not in Workers");
    });
    const { checkRateLimit } = await import("./rateLimit");
    expect(await checkRateLimit("LISTEN_AUTH_SEND_LIMITER", "1.2.3.4")).toBe(true);
  });

  it("returns true when binding is missing on the env", async () => {
    getCloudflareContextMock.mockResolvedValue({ env: {} });
    const { checkRateLimit } = await import("./rateLimit");
    expect(await checkRateLimit("LISTEN_AUTH_SEND_LIMITER", "1.2.3.4")).toBe(true);
  });

  it("delegates to the binding's limit() and forwards the key", async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    getCloudflareContextMock.mockResolvedValue({
      env: { LISTEN_AUTH_SEND_LIMITER: { limit } },
    });
    const { checkRateLimit } = await import("./rateLimit");
    expect(await checkRateLimit("LISTEN_AUTH_SEND_LIMITER", "1.2.3.4")).toBe(true);
    expect(limit).toHaveBeenCalledWith({ key: "1.2.3.4" });
  });

  it("returns false when the binding reports the limit exceeded", async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    getCloudflareContextMock.mockResolvedValue({
      env: { LISTEN_ASSET_LIMITER: { limit } },
    });
    const { checkRateLimit } = await import("./rateLimit");
    expect(await checkRateLimit("LISTEN_ASSET_LIMITER", "abc")).toBe(false);
  });

  it.each([
    ["production", undefined, true],
    ["production", { failClosed: true }, false],
    ["staging", { failClosed: true }, true],
  ] as const)(
    "on %s with options %o returns %s when context is unavailable",
    async (environment, options, expected) => {
      vi.stubEnv("ENVIRONMENT", environment);
      vi.spyOn(console, "error").mockImplementation(() => {});
      getCloudflareContextMock.mockRejectedValue(new Error("not in Workers"));
      const { checkRateLimit } = await import("./rateLimit");
      expect(await checkRateLimit("GIFT_CODE_LIMITER", "1.2.3.4", options)).toBe(expected);
    },
  );

  it("delegates GIFT_CODE_LIMITER to its binding with the key", async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    getCloudflareContextMock.mockResolvedValue({
      env: { GIFT_CODE_LIMITER: { limit } },
    });
    const { checkRateLimit } = await import("./rateLimit");
    expect(await checkRateLimit("GIFT_CODE_LIMITER", "203.0.113.7", { failClosed: true })).toBe(true);
    expect(limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
  });
});
