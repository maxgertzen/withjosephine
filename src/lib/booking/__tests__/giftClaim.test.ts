import { afterEach, describe, expect, it, vi } from "vitest";

import { issueGiftClaimToken } from "../giftClaim";

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
