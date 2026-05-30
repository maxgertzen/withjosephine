import { describe, expect, it } from "vitest";

import { dbQuery } from "@/lib/booking/persistence/sqlClient";

import { recordListenTokenRedemption } from "../listenTokenRedemptions";

type LedgerRow = {
  jti: string;
  submission_id: string;
  recipient_user_id: string;
  redeemed_at: number;
  ip_hash: string | null;
  mint_source: string;
};

const baseArgs = {
  submissionId: "sub-abc",
  recipientUserId: "user-xyz",
  redeemedAt: 1_700_000_000_000,
  ipHash: "deadbeef",
  uaHash: "uahash-baseline",
  mintSource: "cron_day7" as const,
};

describe("recordListenTokenRedemption", () => {
  it("returns ok=true and inserts a row on first redemption", async () => {
    const result = await recordListenTokenRedemption({ jti: "jti-1", ...baseArgs });
    expect(result).toEqual({ ok: true });

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti, submission_id, recipient_user_id, redeemed_at, ip_hash, mint_source
       FROM listen_token_redemptions WHERE jti = ?`,
      ["jti-1"],
    );
    expect(rows).toHaveLength(1);
  });

  it("returns already_redeemed on second call with the same jti", async () => {
    const first = await recordListenTokenRedemption({ jti: "jti-2", ...baseArgs });
    expect(first).toEqual({ ok: true });

    const second = await recordListenTokenRedemption({ jti: "jti-2", ...baseArgs });
    expect(second).toEqual({ ok: false, reason: "already_redeemed" });

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti FROM listen_token_redemptions WHERE jti = ?`,
      ["jti-2"],
    );
    expect(rows).toHaveLength(1);
  });

  it("under concurrent contention exactly one caller wins", async () => {
    const [a, b] = await Promise.all([
      recordListenTokenRedemption({ jti: "jti-race", ...baseArgs }),
      recordListenTokenRedemption({ jti: "jti-race", ...baseArgs }),
    ]);
    const okCount = [a, b].filter((r) => r.ok).length;
    const alreadyCount = [a, b].filter((r) => !r.ok && r.reason === "already_redeemed").length;
    expect(okCount).toBe(1);
    expect(alreadyCount).toBe(1);

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti FROM listen_token_redemptions WHERE jti = ?`,
      ["jti-race"],
    );
    expect(rows).toHaveLength(1);
  });

  it("persists all seven columns verbatim", async () => {
    await recordListenTokenRedemption({
      jti: "jti-cols",
      submissionId: "sub-cols",
      recipientUserId: "user-cols",
      redeemedAt: 1_700_000_123_456,
      ipHash: "hash-cols",
      uaHash: "ua-cols",
      mintSource: "cron_day7",
    });

    const rows = await dbQuery<LedgerRow & { ua_hash: string | null }>(
      `SELECT jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source
       FROM listen_token_redemptions WHERE jti = ?`,
      ["jti-cols"],
    );
    expect(rows[0]).toEqual({
      jti: "jti-cols",
      submission_id: "sub-cols",
      recipient_user_id: "user-cols",
      redeemed_at: 1_700_000_123_456,
      ip_hash: "hash-cols",
      ua_hash: "ua-cols",
      mint_source: "cron_day7",
    });
  });

  it("accepts a null ip_hash", async () => {
    const result = await recordListenTokenRedemption({
      jti: "jti-null-ip",
      submissionId: "sub-null",
      recipientUserId: "user-null",
      redeemedAt: 1_700_000_000_000,
      ipHash: null,
      uaHash: null,
      mintSource: "cron_day7",
    });
    expect(result).toEqual({ ok: true });

    const rows = await dbQuery<LedgerRow>(
      `SELECT ip_hash FROM listen_token_redemptions WHERE jti = ?`,
      ["jti-null-ip"],
    );
    expect(rows[0]?.ip_hash).toBeNull();
  });

  it("round-trips mint_source=cron_day7", async () => {
    await recordListenTokenRedemption({
      jti: "jti-cron",
      ...baseArgs,
      mintSource: "cron_day7",
    });
    const rows = await dbQuery<LedgerRow>(
      `SELECT mint_source FROM listen_token_redemptions WHERE jti = ?`,
      ["jti-cron"],
    );
    expect(rows[0]?.mint_source).toBe("cron_day7");
  });

  it("round-trips mint_source=admin_resend", async () => {
    await recordListenTokenRedemption({
      jti: "jti-admin",
      ...baseArgs,
      mintSource: "admin_resend",
    });
    const rows = await dbQuery<LedgerRow>(
      `SELECT mint_source FROM listen_token_redemptions WHERE jti = ?`,
      ["jti-admin"],
    );
    expect(rows[0]?.mint_source).toBe("admin_resend");
  });

  it("distinct jti values can both succeed", async () => {
    const a = await recordListenTokenRedemption({ jti: "jti-distinct-a", ...baseArgs });
    const b = await recordListenTokenRedemption({ jti: "jti-distinct-b", ...baseArgs });
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });

    const rows = await dbQuery<LedgerRow>(
      `SELECT jti FROM listen_token_redemptions WHERE jti IN (?, ?) ORDER BY jti`,
      ["jti-distinct-a", "jti-distinct-b"],
    );
    expect(rows.map((r) => r.jti)).toEqual(["jti-distinct-a", "jti-distinct-b"]);
  });

  it("repeated redemption attempts do not overwrite the original row", async () => {
    await recordListenTokenRedemption({
      jti: "jti-overwrite",
      submissionId: "sub-original",
      recipientUserId: "user-original",
      redeemedAt: 1_700_000_000_000,
      ipHash: "ip-original",
      uaHash: "ua-original",
      mintSource: "cron_day7",
    });

    const second = await recordListenTokenRedemption({
      jti: "jti-overwrite",
      submissionId: "sub-different",
      recipientUserId: "user-different",
      redeemedAt: 1_700_000_999_999,
      ipHash: "ip-different",
      uaHash: "ua-different",
      mintSource: "admin_resend",
    });
    expect(second).toEqual({ ok: false, reason: "already_redeemed" });

    const rows = await dbQuery<LedgerRow>(
      `SELECT submission_id, recipient_user_id, redeemed_at, ip_hash, mint_source
       FROM listen_token_redemptions WHERE jti = ?`,
      ["jti-overwrite"],
    );
    expect(rows[0]).toEqual({
      submission_id: "sub-original",
      recipient_user_id: "user-original",
      redeemed_at: 1_700_000_000_000,
      ip_hash: "ip-original",
      mint_source: "cron_day7",
    });
  });

  it("submission_id index supports lookups by submission", async () => {
    await recordListenTokenRedemption({ jti: "jti-by-sub-1", ...baseArgs, submissionId: "sub-shared" });
    await recordListenTokenRedemption({ jti: "jti-by-sub-2", ...baseArgs, submissionId: "sub-shared" });

    const rows = await dbQuery<{ jti: string }>(
      `SELECT jti FROM listen_token_redemptions WHERE submission_id = ? ORDER BY jti`,
      ["sub-shared"],
    );
    expect(rows.map((r) => r.jti)).toEqual(["jti-by-sub-1", "jti-by-sub-2"]);
  });
});
