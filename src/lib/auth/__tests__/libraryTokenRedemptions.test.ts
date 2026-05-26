import { describe, expect, it } from "vitest";

import { dbQuery } from "@/lib/booking/persistence/sqlClient";

import { recordLibraryTokenRedemption } from "../libraryTokenRedemptions";

type LedgerRow = {
  jti: string;
  user_id: string;
  redeemed_at: number;
  ip_hash: string | null;
  mint_source: string;
};

const baseArgs = {
  userId: "user-xyz",
  redeemedAt: 1_700_000_000_000,
  ipHash: "deadbeef",
  mintSource: "order_confirmation" as const,
};

describe("recordLibraryTokenRedemption", () => {
  it("returns ok=true and inserts a row on first redemption", async () => {
    const result = await recordLibraryTokenRedemption({ jti: "jti-1", ...baseArgs });
    expect(result).toEqual({ ok: true });

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti, user_id, redeemed_at, ip_hash, mint_source
       FROM library_token_redemptions WHERE jti = ?`,
      ["jti-1"],
    );
    expect(rows).toHaveLength(1);
  });

  it("returns already_redeemed on second call with the same jti", async () => {
    const first = await recordLibraryTokenRedemption({ jti: "jti-2", ...baseArgs });
    expect(first).toEqual({ ok: true });

    const second = await recordLibraryTokenRedemption({ jti: "jti-2", ...baseArgs });
    expect(second).toEqual({ ok: false, reason: "already_redeemed" });

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti FROM library_token_redemptions WHERE jti = ?`,
      ["jti-2"],
    );
    expect(rows).toHaveLength(1);
  });

  it("under concurrent contention exactly one caller wins", async () => {
    const [a, b] = await Promise.all([
      recordLibraryTokenRedemption({ jti: "jti-race", ...baseArgs }),
      recordLibraryTokenRedemption({ jti: "jti-race", ...baseArgs }),
    ]);
    const okCount = [a, b].filter((r) => r.ok).length;
    const alreadyCount = [a, b].filter((r) => !r.ok && r.reason === "already_redeemed").length;
    expect(okCount).toBe(1);
    expect(alreadyCount).toBe(1);

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti FROM library_token_redemptions WHERE jti = ?`,
      ["jti-race"],
    );
    expect(rows).toHaveLength(1);
  });

  it("persists all five columns verbatim", async () => {
    await recordLibraryTokenRedemption({
      jti: "jti-cols",
      userId: "user-cols",
      redeemedAt: 1_700_000_123_456,
      ipHash: "hash-cols",
      mintSource: "day7_delivery",
    });

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti, user_id, redeemed_at, ip_hash, mint_source
       FROM library_token_redemptions WHERE jti = ?`,
      ["jti-cols"],
    );
    expect(rows[0]).toEqual({
      jti: "jti-cols",
      user_id: "user-cols",
      redeemed_at: 1_700_000_123_456,
      ip_hash: "hash-cols",
      mint_source: "day7_delivery",
    });
  });

  it("accepts a null ip_hash", async () => {
    const result = await recordLibraryTokenRedemption({
      jti: "jti-null-ip",
      userId: "user-null",
      redeemedAt: 1_700_000_000_000,
      ipHash: null,
      mintSource: "order_confirmation",
    });
    expect(result).toEqual({ ok: true });

    const rows = await dbQuery<LedgerRow>(
      `SELECT ip_hash FROM library_token_redemptions WHERE jti = ?`,
      ["jti-null-ip"],
    );
    expect(rows[0]?.ip_hash).toBeNull();
  });

  it("round-trips all five mint_source values", async () => {
    const sources = [
      "order_confirmation",
      "day7_delivery",
      "gift_purchase_self_send",
      "gift_purchase_scheduled",
      "admin_resend",
    ] as const;
    for (const source of sources) {
      await recordLibraryTokenRedemption({
        jti: `jti-source-${source}`,
        ...baseArgs,
        mintSource: source,
      });
    }
    const rows = await dbQuery<LedgerRow>(
      `SELECT jti, mint_source FROM library_token_redemptions WHERE jti LIKE 'jti-source-%' ORDER BY jti`,
    );
    expect(rows.map((r) => r.mint_source).sort()).toEqual([...sources].sort());
  });

  it("distinct jti values can both succeed", async () => {
    const a = await recordLibraryTokenRedemption({ jti: "jti-distinct-a", ...baseArgs });
    const b = await recordLibraryTokenRedemption({ jti: "jti-distinct-b", ...baseArgs });
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti FROM library_token_redemptions WHERE jti IN (?, ?) ORDER BY jti`,
      ["jti-distinct-a", "jti-distinct-b"],
    );
    expect(rows.map((r) => r.jti)).toEqual(["jti-distinct-a", "jti-distinct-b"]);
  });

  it("repeated redemption attempts do not overwrite the original row", async () => {
    await recordLibraryTokenRedemption({
      jti: "jti-overwrite",
      userId: "user-original",
      redeemedAt: 1_700_000_000_000,
      ipHash: "ip-original",
      mintSource: "order_confirmation",
    });

    const second = await recordLibraryTokenRedemption({
      jti: "jti-overwrite",
      userId: "user-different",
      redeemedAt: 1_700_000_999_999,
      ipHash: "ip-different",
      mintSource: "admin_resend",
    });
    expect(second).toEqual({ ok: false, reason: "already_redeemed" });

    const rows = await dbQuery<LedgerRow>(
      `SELECT user_id, redeemed_at, ip_hash, mint_source
       FROM library_token_redemptions WHERE jti = ?`,
      ["jti-overwrite"],
    );
    expect(rows[0]).toEqual({
      user_id: "user-original",
      redeemed_at: 1_700_000_000_000,
      ip_hash: "ip-original",
      mint_source: "order_confirmation",
    });
  });

  it("user_id index supports lookups by user", async () => {
    await recordLibraryTokenRedemption({ jti: "jti-by-user-1", ...baseArgs, userId: "user-shared" });
    await recordLibraryTokenRedemption({ jti: "jti-by-user-2", ...baseArgs, userId: "user-shared" });

    const rows = await dbQuery<{ jti: string }>(
      `SELECT jti FROM library_token_redemptions WHERE user_id = ? ORDER BY jti`,
      ["user-shared"],
    );
    expect(rows.map((r) => r.jti)).toEqual(["jti-by-user-1", "jti-by-user-2"]);
  });
});
