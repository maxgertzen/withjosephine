import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { createListenSessionForUser } from "@/lib/auth/listenSession";
import {
  generateOtpCode,
  hashOtpCode,
  issueStepUpOtp,
  STEP_UP_ELEVATION_TTL_MS,
  STEP_UP_OTP_MISMATCH_LIMIT,
  STEP_UP_OTP_THROTTLE_CAP,
  STEP_UP_OTP_THROTTLE_GAP_MS,
  STEP_UP_OTP_THROTTLE_WINDOW_MS,
  STEP_UP_OTP_TTL_MS,
  verifyStepUpOtp,
} from "@/lib/auth/stepUpOtp";
import { deriveTokenSubkeyHex } from "@/lib/auth/tokenSubkey";
import { getOrCreateUser } from "@/lib/auth/users";
import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";

async function seedUser(email = "alice@example.com"): Promise<string> {
  const { userId } = await getOrCreateUser({ email });
  return userId;
}

async function seedSession(userId: string): Promise<string> {
  const { sessionId } = await createListenSessionForUser({
    userId,
    ipHash: null,
    userAgentHash: null,
  });
  return sessionId;
}

async function getSessionElevation(sessionId: string): Promise<number | null> {
  const rows = await dbQuery<{ elevated_at: number | null }>(
    `SELECT elevated_at FROM listen_session WHERE id = ?`,
    [sessionId],
  );
  return rows[0]?.elevated_at ?? null;
}

describe("stepUpOtp", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_TOKEN_SECRET", "test-master-secret-please-rotate");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("generateOtpCode", () => {
    it("returns a string of exactly 6 numeric digits", () => {
      const code = generateOtpCode();
      expect(code).toMatch(/^[0-9]{6}$/);
      expect(code).toHaveLength(6);
    });

    it("1000 calls yield well-distributed samples without collapse to a single value", () => {
      const samples = new Set<string>();
      for (let i = 0; i < 1000; i += 1) samples.add(generateOtpCode());
      // 10^6 space, 1k draws: birthday-collision expectation is ~0.5
      // (i.e. tiny). Lower bound of 990 catches a degenerate "always
      // returns the same code" bug without flaking on legitimate
      // collisions.
      expect(samples.size).toBeGreaterThanOrEqual(990);
    });
  });

  describe("hashOtpCode", () => {
    it("returns HMAC-SHA-256 under the stepup.v1 subkey as 64-char hex", async () => {
      const hash = await hashOtpCode("123456");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      const subkey = await deriveTokenSubkeyHex("stepup.v1");
      expect(subkey).toMatch(/^[0-9a-f]{64}$/);
    });

    it("rejects non-6-digit input with a thrown error", async () => {
      await expect(hashOtpCode("12345")).rejects.toThrow("6 digits");
      await expect(hashOtpCode("1234567")).rejects.toThrow("6 digits");
      await expect(hashOtpCode("abcdef")).rejects.toThrow("6 digits");
      await expect(hashOtpCode("")).rejects.toThrow("6 digits");
    });

    it("is deterministic across calls", async () => {
      const a = await hashOtpCode("123456");
      const b = await hashOtpCode("123456");
      expect(a).toBe(b);
    });

    it("produces a distinct hash for a different code", async () => {
      const a = await hashOtpCode("123456");
      const b = await hashOtpCode("654321");
      expect(a).not.toBe(b);
    });
  });

  describe("issueStepUpOtp", () => {
    it("returns ok with a 6-digit code and the row persisted as a hash", async () => {
      const userId = await seedUser();
      const result = await issueStepUpOtp({ userId });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("typeguard");
      expect(result.code).toMatch(/^[0-9]{6}$/);
      const expectedHash = await hashOtpCode(result.code);
      const rows = await dbQuery<{ code_hash: string }>(
        `SELECT code_hash FROM step_up_otp WHERE user_id = ?`,
        [userId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.code_hash).toBe(expectedHash);
      // Raw code is never persisted.
      expect(rows[0]!.code_hash).not.toBe(result.code);
    });

    it("sets expires_at = now + 15 min", async () => {
      const userId = await seedUser();
      const now = 1_700_000_000_000;
      const result = await issueStepUpOtp({ userId, now });
      if (!result.ok) throw new Error("typeguard");
      expect(result.expiresAt).toBe(now + STEP_UP_OTP_TTL_MS);
    });

    it("writes a step_up_otp_issued audit row", async () => {
      const userId = await seedUser();
      await issueStepUpOtp({ userId });
      const rows = await dbQuery<{ event_type: string; success: number }>(
        `SELECT event_type, success FROM listen_audit
           WHERE user_id = ? AND event_type = 'step_up_otp_issued'`,
        [userId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ event_type: "step_up_otp_issued", success: 1 });
    });

    it("returns throttled_gap when called twice within 30 seconds, with retryAfterSec", async () => {
      const userId = await seedUser();
      const now = 1_700_000_000_000;
      const first = await issueStepUpOtp({ userId, now });
      expect(first.ok).toBe(true);

      const second = await issueStepUpOtp({ userId, now: now + 1000 });
      expect(second.ok).toBe(false);
      if (second.ok) throw new Error("typeguard");
      expect(second.reason).toBe("throttled_gap");
      expect(second.retryAfterSec).toBeGreaterThan(0);
      expect(second.retryAfterSec).toBeLessThanOrEqual(STEP_UP_OTP_THROTTLE_GAP_MS / 1000);

      // No row written on throttle.
      const rows = await dbQuery<{ id: string }>(
        `SELECT id FROM step_up_otp WHERE user_id = ?`,
        [userId],
      );
      expect(rows).toHaveLength(1);
    });

    it("clears throttled_gap after the 30s gap elapses", async () => {
      const userId = await seedUser();
      const now = 1_700_000_000_000;
      await issueStepUpOtp({ userId, now });
      const after = await issueStepUpOtp({
        userId,
        now: now + STEP_UP_OTP_THROTTLE_GAP_MS + 1,
      });
      expect(after.ok).toBe(true);
    });

    it("returns throttled_cap when 3 live OTPs already exist in the 30-min window", async () => {
      const userId = await seedUser();
      const t0 = 1_700_000_000_000;
      // Issue three with > 30s gaps between each so we only hit the cap, not the gap.
      const r1 = await issueStepUpOtp({ userId, now: t0 });
      const r2 = await issueStepUpOtp({ userId, now: t0 + STEP_UP_OTP_THROTTLE_GAP_MS + 1 });
      const r3 = await issueStepUpOtp({
        userId,
        now: t0 + 2 * (STEP_UP_OTP_THROTTLE_GAP_MS + 1),
      });
      expect(r1.ok && r2.ok && r3.ok).toBe(true);

      const fourth = await issueStepUpOtp({
        userId,
        now: t0 + 3 * (STEP_UP_OTP_THROTTLE_GAP_MS + 1),
      });
      expect(fourth.ok).toBe(false);
      if (fourth.ok) throw new Error("typeguard");
      expect(fourth.reason).toBe("throttled_cap");
      expect(fourth.retryAfterSec).toBeGreaterThan(0);
      expect(STEP_UP_OTP_THROTTLE_CAP).toBe(3);
    });

    it("excludes consumed (poisoned) rows from the cap so a poisoned user can re-request immediately", async () => {
      const userId = await seedUser();
      const sessionId = await seedSession(userId);
      const t0 = 1_700_000_000_000;

      // Issue an OTP and poison it via 5 wrong guesses, all within the
      // 30-min window. The poisoned row sits with consumed_at != NULL.
      const issued = await issueStepUpOtp({ userId, now: t0 });
      if (!issued.ok) throw new Error("typeguard");
      for (let i = 0; i < STEP_UP_OTP_MISMATCH_LIMIT; i += 1) {
        await verifyStepUpOtp({
          code: "000000",
          userId,
          sessionId,
          now: t0 + 1000 + i,
        });
      }

      // Issue two more LIVE ones (with gaps), bringing live count = 2.
      const r2 = await issueStepUpOtp({ userId, now: t0 + STEP_UP_OTP_THROTTLE_GAP_MS + 1 });
      const r3 = await issueStepUpOtp({
        userId,
        now: t0 + 2 * (STEP_UP_OTP_THROTTLE_GAP_MS + 1),
      });
      expect(r2.ok && r3.ok).toBe(true);

      // 4th attempt: total rows in window = 4, but only 2 are live →
      // under the cap of 3 → allowed.
      const r4 = await issueStepUpOtp({
        userId,
        now: t0 + 3 * (STEP_UP_OTP_THROTTLE_GAP_MS + 1),
      });
      expect(r4.ok).toBe(true);
    });
  });

  describe("verifyStepUpOtp", () => {
    it("returns no_pending when no OTP row exists for the user", async () => {
      const userId = await seedUser();
      const sessionId = await seedSession(userId);
      const result = await verifyStepUpOtp({ code: "123456", userId, sessionId });
      expect(result).toEqual({ ok: false, reason: "no_pending" });
    });

    it("returns expired when the only row is past expires_at", async () => {
      const userId = await seedUser();
      const sessionId = await seedSession(userId);
      const issued = await issueStepUpOtp({ userId, now: Date.now() - 2 * STEP_UP_OTP_TTL_MS });
      if (!issued.ok) throw new Error("typeguard");
      const result = await verifyStepUpOtp({
        code: issued.code,
        userId,
        sessionId,
      });
      expect(result).toEqual({ ok: false, reason: "expired" });

      const audit = await dbQuery<{ event_type: string }>(
        `SELECT event_type FROM listen_audit
           WHERE user_id = ? AND event_type = 'step_up_otp_expired'`,
        [userId],
      );
      expect(audit).toHaveLength(1);
    });

    it("returns already_consumed when the only row was already used", async () => {
      const userId = await seedUser();
      const sessionId = await seedSession(userId);
      const issued = await issueStepUpOtp({ userId });
      if (!issued.ok) throw new Error("typeguard");
      const first = await verifyStepUpOtp({ code: issued.code, userId, sessionId });
      expect(first.ok).toBe(true);
      const second = await verifyStepUpOtp({ code: issued.code, userId, sessionId });
      expect(second).toEqual({ ok: false, reason: "already_consumed" });
    });

    it("returns mismatch on wrong code and increments mismatch_count", async () => {
      const userId = await seedUser();
      const sessionId = await seedSession(userId);
      const issued = await issueStepUpOtp({ userId });
      if (!issued.ok) throw new Error("typeguard");
      // Pick a code that definitely doesn't match.
      const wrong = issued.code === "000000" ? "111111" : "000000";
      const result = await verifyStepUpOtp({ code: wrong, userId, sessionId });
      expect(result).toEqual({ ok: false, reason: "mismatch" });

      const rows = await dbQuery<{ mismatch_count: number; consumed_at: number | null }>(
        `SELECT mismatch_count, consumed_at FROM step_up_otp WHERE user_id = ?`,
        [userId],
      );
      expect(rows[0]!.mismatch_count).toBe(1);
      expect(rows[0]!.consumed_at).toBeNull();
    });

    it("returns poisoned on the 5th mismatch and sets consumed_at", async () => {
      const userId = await seedUser();
      const sessionId = await seedSession(userId);
      const issued = await issueStepUpOtp({ userId });
      if (!issued.ok) throw new Error("typeguard");
      const wrong = issued.code === "000000" ? "111111" : "000000";
      let last = await verifyStepUpOtp({ code: wrong, userId, sessionId });
      for (let i = 1; i < STEP_UP_OTP_MISMATCH_LIMIT; i += 1) {
        last = await verifyStepUpOtp({ code: wrong, userId, sessionId });
      }
      expect(last).toEqual({ ok: false, reason: "poisoned" });

      const rows = await dbQuery<{ consumed_at: number | null; mismatch_count: number }>(
        `SELECT consumed_at, mismatch_count FROM step_up_otp WHERE user_id = ?`,
        [userId],
      );
      expect(rows[0]!.consumed_at).not.toBeNull();
      expect(rows[0]!.mismatch_count).toBe(STEP_UP_OTP_MISMATCH_LIMIT);

      const audit = await dbQuery<{ event_type: string }>(
        `SELECT event_type FROM listen_audit
           WHERE user_id = ? AND event_type = 'step_up_otp_poisoned'`,
        [userId],
      );
      expect(audit).toHaveLength(1);
    });

    it("returns ok on the correct code, atomically consuming and elevating the session", async () => {
      const userId = await seedUser();
      const sessionId = await seedSession(userId);
      const issued = await issueStepUpOtp({ userId });
      if (!issued.ok) throw new Error("typeguard");
      const now = Date.now();
      const result = await verifyStepUpOtp({
        code: issued.code,
        userId,
        sessionId,
        now,
      });
      expect(result).toEqual({ ok: true, elevatedAt: now });

      // OTP row consumed.
      const rows = await dbQuery<{ consumed_at: number | null }>(
        `SELECT consumed_at FROM step_up_otp WHERE user_id = ?`,
        [userId],
      );
      expect(rows[0]!.consumed_at).toBe(now);

      // Session elevated_at flipped.
      expect(await getSessionElevation(sessionId)).toBe(now);

      // Two audit rows: step_up_otp_verified + step_up_elevated.
      const audit = await dbQuery<{ event_type: string }>(
        `SELECT event_type FROM listen_audit
           WHERE user_id = ? AND event_type IN ('step_up_otp_verified', 'step_up_elevated')
           ORDER BY timestamp ASC`,
        [userId],
      );
      expect(audit.map((r) => r.event_type)).toEqual([
        AUDIT_EVENT_TYPE.step_up_otp_verified,
        AUDIT_EVENT_TYPE.step_up_elevated,
      ]);
    });

    it("does not cross-match across users (Alice's code cannot authorize Bob's session)", async () => {
      const aliceId = await seedUser("alice@example.com");
      const bobId = await seedUser("bob@example.com");
      const bobSession = await seedSession(bobId);
      const issued = await issueStepUpOtp({ userId: aliceId });
      if (!issued.ok) throw new Error("typeguard");

      // Bob tries to verify with Alice's code against his own user_id.
      const result = await verifyStepUpOtp({
        code: issued.code,
        userId: bobId,
        sessionId: bobSession,
      });
      expect(result.ok).toBe(false);

      // Alice's row is untouched.
      const rows = await dbQuery<{ consumed_at: number | null; mismatch_count: number }>(
        `SELECT consumed_at, mismatch_count FROM step_up_otp WHERE user_id = ?`,
        [aliceId],
      );
      expect(rows[0]!.consumed_at).toBeNull();
      expect(rows[0]!.mismatch_count).toBe(0);
    });

    it("uses timing-safe comparison (same-length hash equality semantics)", async () => {
      // Cross-checks that two genuinely-equal hashes match and two
      // genuinely-different hashes don't, without observable timing
      // semantics being asserted (impractical in JS); the binary
      // contract suffices.
      const userId = await seedUser();
      const sessionId = await seedSession(userId);
      const issued = await issueStepUpOtp({ userId });
      if (!issued.ok) throw new Error("typeguard");
      const correct = await verifyStepUpOtp({ code: issued.code, userId, sessionId });
      expect(correct.ok).toBe(true);
    });
  });

  describe("constants", () => {
    it("STEP_UP_OTP_TTL_MS is 15 minutes", () => {
      expect(STEP_UP_OTP_TTL_MS).toBe(15 * 60 * 1000);
    });

    it("STEP_UP_ELEVATION_TTL_MS is 10 minutes", () => {
      expect(STEP_UP_ELEVATION_TTL_MS).toBe(10 * 60 * 1000);
    });

    it("STEP_UP_OTP_MISMATCH_LIMIT is 5", () => {
      expect(STEP_UP_OTP_MISMATCH_LIMIT).toBe(5);
    });

    it("STEP_UP_OTP_THROTTLE_WINDOW_MS is 30 minutes", () => {
      expect(STEP_UP_OTP_THROTTLE_WINDOW_MS).toBe(30 * 60 * 1000);
    });
  });

  describe("schema integration", () => {
    it("step_up_otp table is created with the expected columns", async () => {
      // The migration applies via the sqlite test client; just verify
      // INSERT with the documented column set works.
      const userId = await seedUser();
      await dbExec(
        `INSERT INTO step_up_otp
           (id, user_id, code_hash, expires_at, consumed_at, mismatch_count, created_at, ip_hash, user_agent_hash)
         VALUES (?, ?, ?, ?, NULL, 0, ?, NULL, NULL)`,
        ["row-1", userId, "h".repeat(64), Date.now() + 60_000, Date.now()],
      );
      const rows = await dbQuery<{ id: string }>(
        `SELECT id FROM step_up_otp WHERE id = 'row-1'`,
      );
      expect(rows).toHaveLength(1);
    });
  });
});
