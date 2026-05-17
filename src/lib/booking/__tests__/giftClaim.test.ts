import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/persistence/repository", () => ({
  findUnclaimedGiftByTokenHash: vi.fn(),
}));

import { findUnclaimedGiftByTokenHash } from "@/lib/booking/persistence/repository";

import { issueGiftClaimToken, verifyGiftClaimToken } from "../giftClaim";

const mockFind = vi.mocked(findUnclaimedGiftByTokenHash);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("issueGiftClaimToken", () => {
  it("produces a token of 64 hex characters (32 bytes)", async () => {
    const issued = await issueGiftClaimToken();
    expect(issued.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces a SHA-256 hash of 64 hex characters", async () => {
    const issued = await issueGiftClaimToken();
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns distinct tokens across calls (entropy sanity)", async () => {
    const tokens = await Promise.all(
      Array.from({ length: 10 }, () => issueGiftClaimToken().then((t) => t.token)),
    );
    const unique = new Set(tokens);
    expect(unique.size).toBe(10);
  });

  it("token and tokenHash differ — hash is not the raw token", async () => {
    const issued = await issueGiftClaimToken();
    expect(issued.tokenHash).not.toBe(issued.token);
  });

  it("claim URL uses /gift/claim?token=<token> path on the default origin", async () => {
    const issued = await issueGiftClaimToken();
    expect(issued.claimUrl).toBe(`https://withjosephine.com/gift/claim?token=${issued.token}`);
  });

  it("claim URL respects NEXT_PUBLIC_SITE_ORIGIN env override", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://staging.withjosephine.com");
    const issued = await issueGiftClaimToken();
    expect(issued.claimUrl.startsWith("https://staging.withjosephine.com/gift/claim?token="))
      .toBe(true);
  });

  it("never embeds the raw token in the hash output", async () => {
    const issued = await issueGiftClaimToken();
    expect(issued.tokenHash.includes(issued.token)).toBe(false);
  });
});

// Phase 5 Session 4b — B5.16 constant-time validation. Garbage tokens and
// shape-valid-unknown tokens must both perform a hash + a DB lookup so the
// wall-clock timing leaks nothing about why a lookup failed.
describe("verifyGiftClaimToken — constant-time validation (B5.16)", () => {
  beforeEach(() => {
    mockFind.mockReset().mockResolvedValue(null);
  });

  it("garbage tokens still issue a DB lookup", async () => {
    const result = await verifyGiftClaimToken("not-a-hex-token");
    expect(result).toBeNull();
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it("empty string still issues a DB lookup", async () => {
    const result = await verifyGiftClaimToken("");
    expect(result).toBeNull();
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it("non-string input still issues a DB lookup", async () => {
    const result = await verifyGiftClaimToken(undefined);
    expect(result).toBeNull();
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it("valid-shape unknown token issues a DB lookup", async () => {
    const result = await verifyGiftClaimToken("a".repeat(64));
    expect(result).toBeNull();
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it("valid-shape known token returns the match", async () => {
    mockFind.mockResolvedValueOnce({ _id: "sub_gift_1" } as never);
    const result = await verifyGiftClaimToken("a".repeat(64));
    expect(result).toEqual({ _id: "sub_gift_1" });
    expect(mockFind).toHaveBeenCalledTimes(1);
  });
});
