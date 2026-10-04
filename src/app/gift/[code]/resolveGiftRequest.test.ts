import { beforeEach, describe, expect, it, vi } from "vitest";

const requestScope = vi.hoisted(() => ({ results: new Map<string, unknown>() }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const requestScopedCache = <Args extends unknown[], Result>(fn: (...args: Args) => Result) => {
    const results = requestScope.results as Map<string, Result>;
    return (...args: Args): Result => {
      const key = JSON.stringify(args);
      if (!results.has(key)) results.set(key, fn(...args));
      return results.get(key) as Result;
    };
  };
  return { ...actual, cache: requestScopedCache };
});

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("__notfound__");
  }),
}));

vi.mock("@/lib/gift/giftRateLimit", () => ({ checkGiftRateLimit: vi.fn() }));

vi.mock("@/lib/gift/gifts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gift/gifts")>()),
  findGiftByCode: vi.fn(),
}));

vi.mock("@/lib/gift/giftCode", () => ({ deriveVerifiedGiftCode: vi.fn() }));

vi.mock("@/lib/sanity/fetch", () => ({ fetchReadingPublished: vi.fn() }));

import { deriveVerifiedGiftCode } from "@/lib/gift/giftCode";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";
import { findGiftByCode } from "@/lib/gift/gifts";
import type { GiftStatus } from "@/lib/gift/types";
import { fetchReadingPublished } from "@/lib/sanity/fetch";
import { makeGiftRecord } from "@/test/fixtures/gift";

import { resolveGiftRequest } from "./resolveGiftRequest";

const CODE = "K7M2QX9PH4TR";

const mockRateLimit = vi.mocked(checkGiftRateLimit);
const mockFindGift = vi.mocked(findGiftByCode);
const mockVerifiedCode = vi.mocked(deriveVerifiedGiftCode);
const mockFetchReading = vi.mocked(fetchReadingPublished);

function giftWith(status: GiftStatus, readingSlug = "birth-chart") {
  return makeGiftRecord({ status, readingSlug, buyerFirstName: "Dana", note: "For you." });
}

beforeEach(() => {
  requestScope.results.clear();
  vi.stubEnv("GIFTS_ENABLED", "1");
  mockRateLimit.mockReset().mockResolvedValue(true);
  mockFindGift.mockReset().mockResolvedValue(null);
  mockVerifiedCode.mockReset().mockResolvedValue(CODE);
  mockFetchReading.mockReset().mockResolvedValue(null);
});

describe("resolveGiftRequest", () => {
  it("calls notFound when gifts are off", async () => {
    vi.stubEnv("GIFTS_ENABLED", "0");

    await expect(resolveGiftRequest(CODE)).rejects.toThrow("__notfound__");
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("gives rate_limited and makes no lookup when the limiter refuses", async () => {
    mockRateLimit.mockResolvedValue(false);

    expect(await resolveGiftRequest(CODE)).toEqual({
      kind: "message",
      message: "rate_limited",
      readingSlug: null,
    });
    expect(mockFindGift).not.toHaveBeenCalled();
  });

  it("gives the same not_found state for a malformed and an unknown code", async () => {
    const malformed = await resolveGiftRequest("x");
    const unknown = await resolveGiftRequest("AAAAAAAAAAAA");

    expect(malformed).toEqual({ kind: "message", message: "not_found", readingSlug: null });
    expect(unknown).toEqual(malformed);
  });

  it.each<GiftStatus>(["pending", "expired"])("gives not_found for a %s gift", async (status) => {
    mockFindGift.mockResolvedValue(giftWith(status));

    expect(await resolveGiftRequest(CODE)).toEqual({
      kind: "message",
      message: "not_found",
      readingSlug: null,
    });
  });

  it("gives already_opened with the reading for a redeemed gift", async () => {
    mockFindGift.mockResolvedValue(giftWith("redeemed"));

    expect(await resolveGiftRequest(CODE)).toEqual({
      kind: "message",
      message: "already_opened",
      readingSlug: "birth-chart",
    });
  });

  it("gives no_longer_active for a cancelled gift", async () => {
    mockFindGift.mockResolvedValue(giftWith("cancelled"));

    expect(await resolveGiftRequest(CODE)).toMatchObject({
      kind: "message",
      message: "no_longer_active",
    });
  });

  it("gives no_longer_active when the reading is in neither Sanity nor the static list", async () => {
    mockFindGift.mockResolvedValue(giftWith("active", "retired-reading"));

    expect(await resolveGiftRequest(CODE)).toEqual({
      kind: "message",
      message: "no_longer_active",
      readingSlug: null,
    });
  });

  it("gives the form state with the verified code for an active gift", async () => {
    const gift = giftWith("active");
    mockFindGift.mockResolvedValue(gift);

    expect(await resolveGiftRequest("k7m2-qx9p-h4tr")).toEqual({
      kind: "form",
      gift: {
        id: gift.id,
        code: CODE,
        buyerFirstName: "Dana",
        note: "For you.",
        readingSlug: "birth-chart",
      },
    });
  });

  it("gives not_found when the code cannot be verified against the stored hash", async () => {
    mockFindGift.mockResolvedValue(giftWith("active"));
    mockVerifiedCode.mockResolvedValue(null);

    expect(await resolveGiftRequest(CODE)).toMatchObject({ message: "not_found" });
  });

  it("lets a lookup error reach the error boundary", async () => {
    mockFindGift.mockRejectedValue(new Error("D1 unavailable"));

    await expect(resolveGiftRequest(CODE)).rejects.toThrow("D1 unavailable");
  });

  it("calls the limiter once when generateMetadata and the page both resolve the request", async () => {
    mockFindGift.mockResolvedValue(giftWith("active"));

    await Promise.all([resolveGiftRequest(CODE), resolveGiftRequest(CODE)]);

    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(mockFindGift).toHaveBeenCalledTimes(1);
  });
});
