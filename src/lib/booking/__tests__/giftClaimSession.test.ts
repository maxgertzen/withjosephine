import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GIFT_CLAIM_TTL_MS,
  signGiftClaimCookie,
  verifyGiftClaimCookie,
} from "../giftClaimSession";

beforeEach(() => {
  vi.stubEnv("LISTEN_TOKEN_SECRET", "test-secret-please-rotate");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("gift claim session cookie", () => {
  it("round-trips a valid cookie value", async () => {
    const now = 1_000_000_000_000;
    const cookie = await signGiftClaimCookie("sub_gift", now);
    const verified = await verifyGiftClaimCookie(cookie, now + 1000);
    expect(verified).toBe("sub_gift");
  });

  it("rejects an expired cookie", async () => {
    const now = 1_000_000_000_000;
    const cookie = await signGiftClaimCookie("sub_gift", now);
    const verified = await verifyGiftClaimCookie(cookie, now + GIFT_CLAIM_TTL_MS + 1);
    expect(verified).toBeNull();
  });

  it("rejects a tampered submissionId", async () => {
    const now = 1_000_000_000_000;
    const cookie = await signGiftClaimCookie("sub_gift", now);
    const tampered = cookie.replace("sub_gift", "sub_attacker");
    const verified = await verifyGiftClaimCookie(tampered, now + 1000);
    expect(verified).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const now = 1_000_000_000_000;
    const cookie = await signGiftClaimCookie("sub_gift", now);
    const parts = cookie.split(".");
    parts[2] = "AAAAAAAAAAAAAAAAAAAAAAAA";
    const verified = await verifyGiftClaimCookie(parts.join("."), now + 1000);
    expect(verified).toBeNull();
  });

  it("rejects a malformed cookie value", async () => {
    expect(await verifyGiftClaimCookie("garbage")).toBeNull();
    expect(await verifyGiftClaimCookie("a.b")).toBeNull();
    expect(await verifyGiftClaimCookie("")).toBeNull();
    expect(await verifyGiftClaimCookie(null)).toBeNull();
    expect(await verifyGiftClaimCookie(undefined)).toBeNull();
  });

  it("rejects a cookie with non-numeric exp", async () => {
    const cookie = "sub_gift.notanumber.AAAAAAAAAAAAAAAAAAAAAAAA";
    expect(await verifyGiftClaimCookie(cookie)).toBeNull();
  });
});
