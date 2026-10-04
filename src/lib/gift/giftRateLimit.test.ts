import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));

import { checkRateLimit } from "@/lib/auth/rateLimit";

import { checkGiftRateLimit } from "./giftRateLimit";

const mockCheckRateLimit = vi.mocked(checkRateLimit);

afterEach(() => {
  vi.unstubAllEnvs();
  mockCheckRateLimit.mockReset();
});

describe("checkGiftRateLimit", () => {
  it("keys on cf-connecting-ip in production and ignores x-forwarded-for", async () => {
    vi.stubEnv("ENVIRONMENT", "production");
    mockCheckRateLimit.mockResolvedValue(true);
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.9",
    });

    await checkGiftRateLimit(headers);

    expect(mockCheckRateLimit).toHaveBeenCalledWith("GIFT_CODE_LIMITER", "203.0.113.7", {
      failClosed: true,
    });
  });

  it("keys on unknown in production when only x-forwarded-for is present", async () => {
    vi.stubEnv("ENVIRONMENT", "production");
    mockCheckRateLimit.mockResolvedValue(true);

    await checkGiftRateLimit(new Headers({ "x-forwarded-for": "198.51.100.9" }));

    expect(mockCheckRateLimit).toHaveBeenCalledWith("GIFT_CODE_LIMITER", "unknown", {
      failClosed: true,
    });
  });

  it("returns the limiter result", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    expect(await checkGiftRateLimit(new Headers())).toBe(false);
  });
});
