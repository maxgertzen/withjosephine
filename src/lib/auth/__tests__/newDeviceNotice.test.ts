import { beforeEach, describe, expect, it, vi } from "vitest";

import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";

import {
  findBaselineUaHash,
  gateNewDeviceNotice,
  maybeRecordNewDeviceForSubmission,
  mintNewDeviceRevokeToken,
  recordNewDeviceNotification,
  revokeAllSessionsForUser,
  verifyNewDeviceRevokeToken,
} from "../newDeviceNotice";

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-secret-please-replace-in-real-env-32b");
});

describe("gateNewDeviceNotice", () => {
  it("skips when current ua hash is null", () => {
    const result = gateNewDeviceNotice({ baselineUaHash: "abc", currentUaHash: null });
    expect(result).toEqual({ fire: false, reason: "no_current_ua" });
  });

  it("skips when baseline is null (no prior redemptions on this submission)", () => {
    const result = gateNewDeviceNotice({ baselineUaHash: null, currentUaHash: "abc" });
    expect(result).toEqual({ fire: false, reason: "no_baseline" });
  });

  it("skips when current matches baseline (same device)", () => {
    const result = gateNewDeviceNotice({ baselineUaHash: "abc", currentUaHash: "abc" });
    expect(result).toEqual({ fire: false, reason: "same_device" });
  });

  it("fires when current differs from baseline", () => {
    const result = gateNewDeviceNotice({ baselineUaHash: "abc", currentUaHash: "xyz" });
    expect(result).toEqual({ fire: true, uaHash: "xyz" });
  });
});

describe("findBaselineUaHash", () => {
  it("returns null when no redemptions exist", async () => {
    const result = await findBaselineUaHash({
      submissionId: "sub-missing",
      recipientUserId: "user-missing",
    });
    expect(result.baselineUaHash).toBeNull();
  });

  it("returns the earliest listen-token redemption ua_hash", async () => {
    await dbExec(
      `INSERT INTO listen_token_redemptions
         (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["jti-late", "sub-1", "user-1", 2_000, null, "ua-late", "cron_day7"],
    );
    await dbExec(
      `INSERT INTO listen_token_redemptions
         (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["jti-early", "sub-1", "user-1", 1_000, null, "ua-early", "cron_day7"],
    );
    const result = await findBaselineUaHash({
      submissionId: "sub-1",
      recipientUserId: "user-1",
    });
    expect(result.baselineUaHash).toBe("ua-early");
  });

  it("returns the earliest across both listen and library redemption tables", async () => {
    await dbExec(
      `INSERT INTO listen_token_redemptions
         (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["jti-listen", "sub-mix", "user-mix", 5_000, null, "ua-listen", "cron_day7"],
    );
    await dbExec(
      `INSERT INTO library_token_redemptions
         (jti, user_id, redeemed_at, ip_hash, ua_hash, mint_source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["jti-lib", "user-mix", 3_000, null, "ua-library", "order_confirmation"],
    );
    const result = await findBaselineUaHash({
      submissionId: "sub-mix",
      recipientUserId: "user-mix",
    });
    expect(result.baselineUaHash).toBe("ua-library");
  });

  it("skips rows with null ua_hash (pre-migration redemptions)", async () => {
    await dbExec(
      `INSERT INTO listen_token_redemptions
         (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["jti-prelegacy", "sub-legacy", "user-legacy", 1_000, null, null, "cron_day7"],
    );
    const result = await findBaselineUaHash({
      submissionId: "sub-legacy",
      recipientUserId: "user-legacy",
    });
    expect(result.baselineUaHash).toBeNull();
  });
});

describe("recordNewDeviceNotification", () => {
  it("inserts the dedup row on first call", async () => {
    const result = await recordNewDeviceNotification({
      submissionId: "sub-dedup",
      uaHash: "ua-dedup",
      notifiedAt: 1_000,
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns already_notified on second call with same (submission_id, ua_hash)", async () => {
    await recordNewDeviceNotification({
      submissionId: "sub-twice",
      uaHash: "ua-twice",
      notifiedAt: 1_000,
    });
    const second = await recordNewDeviceNotification({
      submissionId: "sub-twice",
      uaHash: "ua-twice",
      notifiedAt: 2_000,
    });
    expect(second).toEqual({ ok: false, reason: "already_notified" });
  });

  it("allows a different ua_hash on the same submission to fire once", async () => {
    const first = await recordNewDeviceNotification({
      submissionId: "sub-multi",
      uaHash: "ua-one",
      notifiedAt: 1_000,
    });
    const second = await recordNewDeviceNotification({
      submissionId: "sub-multi",
      uaHash: "ua-two",
      notifiedAt: 2_000,
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
  });
});

describe("maybeRecordNewDeviceForSubmission (composed)", () => {
  it("returns fired=false when current ua is null", async () => {
    const result = await maybeRecordNewDeviceForSubmission({
      submissionId: "sub-noua",
      recipientUserId: "user-noua",
      currentUaHash: null,
    });
    expect(result).toEqual({ fired: false, reason: "no_current_ua" });
  });

  it("returns fired=false with no_baseline when no redemption history exists", async () => {
    const result = await maybeRecordNewDeviceForSubmission({
      submissionId: "sub-fresh",
      recipientUserId: "user-fresh",
      currentUaHash: "ua-current",
    });
    expect(result).toEqual({ fired: false, reason: "no_baseline" });
  });

  it("returns fired=true and writes dedup row when current differs from baseline", async () => {
    await dbExec(
      `INSERT INTO listen_token_redemptions
         (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["jti-base", "sub-trip", "user-trip", 1_000, null, "ua-baseline", "cron_day7"],
    );
    const result = await maybeRecordNewDeviceForSubmission({
      submissionId: "sub-trip",
      recipientUserId: "user-trip",
      currentUaHash: "ua-new-device",
    });
    expect(result).toEqual({ fired: true, uaHash: "ua-new-device" });

    const dedupRows = await dbQuery<{ submission_id: string }>(
      `SELECT submission_id FROM listen_device_notifications
         WHERE submission_id = ? AND ua_hash = ?`,
      ["sub-trip", "ua-new-device"],
    );
    expect(dedupRows).toHaveLength(1);
  });

  it("returns already_notified on second detection for the same new device", async () => {
    await dbExec(
      `INSERT INTO listen_token_redemptions
         (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["jti-base2", "sub-twice2", "user-twice2", 1_000, null, "ua-base2", "cron_day7"],
    );
    const first = await maybeRecordNewDeviceForSubmission({
      submissionId: "sub-twice2",
      recipientUserId: "user-twice2",
      currentUaHash: "ua-new2",
    });
    const second = await maybeRecordNewDeviceForSubmission({
      submissionId: "sub-twice2",
      recipientUserId: "user-twice2",
      currentUaHash: "ua-new2",
    });
    expect(first).toEqual({ fired: true, uaHash: "ua-new2" });
    expect(second).toEqual({ fired: false, reason: "already_notified" });
  });

  it("returns same_device when current matches baseline", async () => {
    await dbExec(
      `INSERT INTO listen_token_redemptions
         (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["jti-base3", "sub-same", "user-same", 1_000, null, "ua-baseline-same", "cron_day7"],
    );
    const result = await maybeRecordNewDeviceForSubmission({
      submissionId: "sub-same",
      recipientUserId: "user-same",
      currentUaHash: "ua-baseline-same",
    });
    expect(result).toEqual({ fired: false, reason: "same_device" });
  });
});

describe("revoke token mint/verify roundtrip", () => {
  it("mints a token that verifies successfully", async () => {
    const token = await mintNewDeviceRevokeToken({
      recipientUserId: "user-rt",
      submissionId: "sub-rt",
    });
    const result = await verifyNewDeviceRevokeToken({ token });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recipientUserId).toBe("user-rt");
      expect(result.submissionId).toBe("sub-rt");
    }
  });

  it("rejects an expired token", async () => {
    const past = Date.now() - 60 * 60 * 1000;
    const token = await mintNewDeviceRevokeToken({
      recipientUserId: "user-exp",
      submissionId: "sub-exp",
      ttlMs: 1,
      now: past,
    });
    const result = await verifyNewDeviceRevokeToken({ token });
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("rejects a malformed token", async () => {
    const result = await verifyNewDeviceRevokeToken({ token: "not-a-real-token" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(["malformed", "bad_signature"]).toContain(result.reason);
    }
  });

  it("rejects a token with a tampered signature", async () => {
    const token = await mintNewDeviceRevokeToken({
      recipientUserId: "user-tamper",
      submissionId: "sub-tamper",
    });
    const [payload, _sig] = token.split(".");
    const tampered = `${payload}.AAAAAAAAAAAAAAAA`;
    const result = await verifyNewDeviceRevokeToken({ token: tampered });
    expect(result.valid).toBe(false);
  });
});

describe("revokeAllSessionsForUser", () => {
  it("returns 0 when no sessions exist for the user", async () => {
    const result = await revokeAllSessionsForUser({ userId: "user-empty" });
    expect(result.revokedCount).toBe(0);
  });

  it("revokes every active session for the user, leaves others alone", async () => {
    await dbExec(
      `INSERT INTO listen_session
         (id, user_id, token_hash, expires_at, created_at, ip_hash, user_agent_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["s1", "user-revoke", "hash1", 9_999_999_999_999, 0, null, null],
    );
    await dbExec(
      `INSERT INTO listen_session
         (id, user_id, token_hash, expires_at, created_at, ip_hash, user_agent_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["s2", "user-revoke", "hash2", 9_999_999_999_999, 0, null, null],
    );
    await dbExec(
      `INSERT INTO listen_session
         (id, user_id, token_hash, expires_at, created_at, ip_hash, user_agent_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["s3", "user-other", "hash3", 9_999_999_999_999, 0, null, null],
    );

    const result = await revokeAllSessionsForUser({ userId: "user-revoke", now: 1234 });
    expect(result.revokedCount).toBe(2);

    const revoked = await dbQuery<{ id: string; revoked_at: number | null }>(
      `SELECT id, revoked_at FROM listen_session WHERE user_id = ? ORDER BY id`,
      ["user-revoke"],
    );
    expect(revoked).toHaveLength(2);
    expect(revoked[0]?.revoked_at).toBe(1234);
    expect(revoked[1]?.revoked_at).toBe(1234);

    const other = await dbQuery<{ revoked_at: number | null }>(
      `SELECT revoked_at FROM listen_session WHERE user_id = ?`,
      ["user-other"],
    );
    expect(other[0]?.revoked_at).toBeNull();
  });
});
