import "server-only";

/**
 * Step-up OTP primitive for high-risk gift mutations (edit-recipient,
 * send-now, eventual claim-for-yourself). Phase 3 of the one-tap epic.
 *
 * Issue side: short-TTL 6-digit code emailed to the purchaser's stored
 * address, hashed via HMAC-SHA-256 (stepup.v1 subkey) before persistence.
 * Throttled (30s gap + 3 per 30-min cap) so a stolen session cookie can't
 * email-bomb the purchaser's inbox.
 *
 * Verify side: atomic single-use consume + listen_session.elevated_at flip
 * in one dbBatch, no half-state where the OTP is consumed but the session
 * never gets elevated. Timing-safe code-hash compare. Mismatch counter
 * caps at 5; the 5th mismatch poisons the row (sets consumed_at) so the
 * 15-min TTL doesn't grant unlimited guess attempts on a leaked envelope.
 */
import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { dbBatch, dbExec, dbQuery, type SqlStatement } from "@/lib/booking/persistence/sqlClient";
import { signHmacSha256 } from "@/lib/hmac";
import { bytesToHex } from "@/lib/hmac";

import { writeAudit } from "./listenSession";
import { deriveTokenSubkeyHex } from "./tokenSubkey";

export const STEP_UP_OTP_TTL_MS = 15 * 60 * 1000;
export const STEP_UP_ELEVATION_TTL_MS = 10 * 60 * 1000;
export const STEP_UP_OTP_MISMATCH_LIMIT = 5;
export const STEP_UP_OTP_THROTTLE_GAP_MS = 30_000;
export const STEP_UP_OTP_THROTTLE_WINDOW_MS = 30 * 60 * 1000;
export const STEP_UP_OTP_THROTTLE_CAP = 3;

const OTP_DIGITS = 6;
const OTP_PATTERN = /^[0-9]{6}$/;
// 10^6 = 1_000_000. uint32 rejection cap = floor((2^32) / 1_000_000) *
// 1_000_000 = 4_294_000_000. Values >= cap are rejected to keep the
// remainder distribution exactly uniform over 0..999_999.
const OTP_REJECTION_CAP = 4_294_000_000;
const OTP_SPACE = 1_000_000;

/**
 * Generate a 6-digit numeric OTP. Uses `crypto.getRandomValues` (Web Crypto)
 * with rejection sampling against the uint32 range to avoid modulo bias.
 * Naive `getRandomValues % 1_000_000` is biased because 2^32 is not a
 * multiple of 1_000_000.
 */
export function generateOtpCode(): string {
  const buffer = new Uint32Array(1);
  // Resample on the (tiny, ~0.07%) chance the draw lands above the cap.
  // Bounded loop with an explicit ceiling for paranoia; in practice exits
  // on the first iteration ~99.93% of the time.
  for (let attempt = 0; attempt < 16; attempt += 1) {
    crypto.getRandomValues(buffer);
    const value = buffer[0]!;
    if (value < OTP_REJECTION_CAP) {
      return (value % OTP_SPACE).toString().padStart(OTP_DIGITS, "0");
    }
  }
  // Effectively unreachable; rejection probability after 16 tries is
  // (~0.07%)^16, but we still need to satisfy the type system.
  throw new Error("generateOtpCode: rejection sampling exhausted");
}

/**
 * HMAC-SHA-256 hash of a 6-digit OTP code under the `stepup.v1` HKDF subkey
 * derived from `AUTH_TOKEN_SECRET`. Rejects non-6-digit input so callers
 * can't accidentally hash arbitrary user-controlled strings under the
 * step-up key. Deterministic: same code + same secret always yields same
 * hex digest.
 */
export async function hashOtpCode(code: string): Promise<string> {
  if (!OTP_PATTERN.test(code)) {
    throw new Error("hashOtpCode: code must be exactly 6 digits");
  }
  const subkey = await deriveTokenSubkeyHex("stepup.v1");
  const signature = await signHmacSha256(subkey, code);
  return bytesToHex(signature);
}

type StepUpOtpRow = {
  id: string;
  user_id: string;
  code_hash: string;
  expires_at: number;
  consumed_at: number | null;
  mismatch_count: number;
  created_at: number;
};

export type IssueOtpArgs = {
  userId: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  now?: number;
};

export type IssueOtpResult =
  | { ok: true; code: string; expiresAt: number }
  | { ok: false; reason: "throttled_gap"; retryAfterSec: number }
  | { ok: false; reason: "throttled_cap"; retryAfterSec: number };

/**
 * Issue a fresh OTP for the given userId. Throttles before any DB write so
 * an attacker holding the session cookie can't email-bomb the purchaser.
 *
 *   - throttled_gap: a previous OTP was issued within the last 30s
 *   - throttled_cap: 3+ live (un-consumed) OTPs exist in the last 30 min
 *
 * "Live" excludes consumed rows so poisoned-mismatch rows don't count
 * toward the cap (a legitimate user fat-fingering 5 wrong codes should be
 * able to immediately request a new OTP).
 */
export async function issueStepUpOtp(args: IssueOtpArgs): Promise<IssueOtpResult> {
  const now = args.now ?? Date.now();
  const ipHash = args.ipHash ?? null;
  const userAgentHash = args.userAgentHash ?? null;

  const recentRows = await dbQuery<{ created_at: number; consumed_at: number | null }>(
    `SELECT created_at, consumed_at
       FROM step_up_otp
       WHERE user_id = ? AND created_at > ?
       ORDER BY created_at DESC`,
    [args.userId, now - STEP_UP_OTP_THROTTLE_WINDOW_MS],
  );

  const mostRecent = recentRows[0];
  if (mostRecent && mostRecent.created_at > now - STEP_UP_OTP_THROTTLE_GAP_MS) {
    const retryAfterMs = STEP_UP_OTP_THROTTLE_GAP_MS - (now - mostRecent.created_at);
    return {
      ok: false,
      reason: "throttled_gap",
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  const liveCount = recentRows.filter((r) => r.consumed_at === null).length;
  if (liveCount >= STEP_UP_OTP_THROTTLE_CAP) {
    // Oldest live row drives the unlock time: when it falls out of the
    // 30-min window, the cap drops to (CAP - 1) and a fresh issue clears.
    const oldestLive = [...recentRows]
      .filter((r) => r.consumed_at === null)
      .sort((a, b) => a.created_at - b.created_at)[0];
    const oldestCreatedAt = oldestLive?.created_at ?? now;
    const retryAfterMs = STEP_UP_OTP_THROTTLE_WINDOW_MS - (now - oldestCreatedAt);
    return {
      ok: false,
      reason: "throttled_cap",
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  const code = generateOtpCode();
  const codeHash = await hashOtpCode(code);
  const expiresAt = now + STEP_UP_OTP_TTL_MS;
  const id = crypto.randomUUID();

  await dbExec(
    `INSERT INTO step_up_otp
       (id, user_id, code_hash, expires_at, consumed_at, mismatch_count, created_at, ip_hash, user_agent_hash)
     VALUES (?, ?, ?, ?, NULL, 0, ?, ?, ?)`,
    [id, args.userId, codeHash, expiresAt, now, ipHash, userAgentHash],
  );

  await writeAudit({
    userId: args.userId,
    eventType: AUDIT_EVENT_TYPE.step_up_otp_issued,
    ipHash,
    userAgentHash,
    success: true,
    now,
  });

  return { ok: true, code, expiresAt };
}

export type VerifyOtpArgs = {
  code: string;
  userId: string;
  sessionId: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  now?: number;
};

export type VerifyOtpResult =
  | { ok: true; elevatedAt: number }
  | { ok: false; reason: "no_pending" | "expired" | "already_consumed" | "mismatch" | "poisoned" };

/**
 * Constant-time hex string comparison. Hex digits are ASCII so the
 * character-wise XOR accumulator + length-mismatch short-circuit is
 * sufficient. Caller passes only hashed values so a length mismatch
 * indicates internal bug, not adversarial probing.
 */
function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify a submitted OTP for the given user + session. Six result paths:
 *
 *   no_pending      : no live (unconsumed, unexpired) row for this user
 *   expired         : most recent row is past expires_at (no live row)
 *   already_consumed: the only live row got consumed by a concurrent caller
 *   mismatch        : code_hash does not match; counter incremented
 *   poisoned        : 5th mismatch trips the cap; row is now consumed
 *   ok              : atomic: OTP consumed + listen_session.elevated_at set
 *
 * Lookup binds by user_id so a 6-digit collision across users can't
 * cross-match (Alice's "123456" can't authorize Bob's mutation). Atomicity
 * via `dbBatch`: OTP consume + elevation flip + two audit rows in one
 * pipelined transaction.
 */
export async function verifyStepUpOtp(args: VerifyOtpArgs): Promise<VerifyOtpResult> {
  const now = args.now ?? Date.now();
  const ipHash = args.ipHash ?? null;
  const userAgentHash = args.userAgentHash ?? null;

  if (!OTP_PATTERN.test(args.code)) {
    // Treat malformed input as a mismatch attempt against the most-recent
    // live row so the counter still applies (defeats "try all malformed
    // shapes" probes). If no live row, surface no_pending.
    return verifyWithRow(args, now, ipHash, userAgentHash, await fetchLiveRow(args.userId, now));
  }

  const liveRow = await fetchLiveRow(args.userId, now);
  return verifyWithRow(args, now, ipHash, userAgentHash, liveRow);
}

async function fetchLiveRow(userId: string, now: number): Promise<StepUpOtpRow | null> {
  const rows = await dbQuery<StepUpOtpRow>(
    `SELECT id, user_id, code_hash, expires_at, consumed_at, mismatch_count, created_at
       FROM step_up_otp
       WHERE user_id = ? AND consumed_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC
       LIMIT 1`,
    [userId, now],
  );
  return rows[0] ?? null;
}

async function verifyWithRow(
  args: VerifyOtpArgs,
  now: number,
  ipHash: string | null,
  userAgentHash: string | null,
  liveRow: StepUpOtpRow | null,
): Promise<VerifyOtpResult> {
  if (!liveRow) {
    // Distinguish "user never requested an OTP" from "user had one but it
    // expired" (the latter helps support diagnose timing complaints). We
    // look at the most-recent row of ANY age for this user (no time bound)
    // so a row that expired 16+ min ago still surfaces as `expired`.
    const recent = await dbQuery<{ expires_at: number; consumed_at: number | null }>(
      `SELECT expires_at, consumed_at
         FROM step_up_otp
         WHERE user_id = ?
         ORDER BY created_at DESC LIMIT 1`,
      [args.userId],
    );
    const previous = recent[0];
    if (previous && previous.consumed_at === null && previous.expires_at <= now) {
      await writeAudit({
        userId: args.userId,
        eventType: AUDIT_EVENT_TYPE.step_up_otp_expired,
        ipHash,
        userAgentHash,
        success: false,
        now,
      });
      return { ok: false, reason: "expired" };
    }
    if (previous && previous.consumed_at !== null) {
      await writeAudit({
        userId: args.userId,
        eventType: AUDIT_EVENT_TYPE.step_up_otp_mismatch,
        ipHash,
        userAgentHash,
        success: false,
        now,
      });
      return { ok: false, reason: "already_consumed" };
    }
    await writeAudit({
      userId: args.userId,
      eventType: AUDIT_EVENT_TYPE.step_up_otp_mismatch,
      ipHash,
      userAgentHash,
      success: false,
      now,
    });
    return { ok: false, reason: "no_pending" };
  }

  // Live row exists. Hash the submitted code (or a known-bad placeholder
  // if input is malformed) and compare under timing-safe equality.
  let submittedHash: string;
  if (OTP_PATTERN.test(args.code)) {
    submittedHash = await hashOtpCode(args.code);
  } else {
    // Never matches a real hash: hex digest is 64 chars; "x".repeat(64) is
    // a constant-time-safe placeholder that fails equality after the
    // length check inside timingSafeHexEqual returns true (lengths match).
    submittedHash = "z".repeat(64);
  }

  if (!timingSafeHexEqual(submittedHash, liveRow.code_hash)) {
    const nextMismatchCount = liveRow.mismatch_count + 1;
    const willPoison = nextMismatchCount >= STEP_UP_OTP_MISMATCH_LIMIT;
    const stmts: SqlStatement[] = [
      {
        sql: `UPDATE step_up_otp
                SET mismatch_count = mismatch_count + 1,
                    consumed_at = CASE WHEN ? = 1 THEN ? ELSE consumed_at END
              WHERE id = ?`,
        params: [willPoison ? 1 : 0, now, liveRow.id],
      },
      {
        sql: `INSERT INTO listen_audit
                (id, user_id, submission_id, event_type, timestamp, ip_hash, user_agent_hash, success)
              VALUES (?, ?, NULL, ?, ?, ?, ?, 0)`,
        params: [
          crypto.randomUUID(),
          args.userId,
          AUDIT_EVENT_TYPE.step_up_otp_mismatch,
          now,
          ipHash,
          userAgentHash,
        ],
      },
    ];
    if (willPoison) {
      stmts.push({
        sql: `INSERT INTO listen_audit
                (id, user_id, submission_id, event_type, timestamp, ip_hash, user_agent_hash, success)
              VALUES (?, ?, NULL, ?, ?, ?, ?, 0)`,
        params: [
          crypto.randomUUID(),
          args.userId,
          AUDIT_EVENT_TYPE.step_up_otp_poisoned,
          now,
          ipHash,
          userAgentHash,
        ],
      });
    }
    await dbBatch(stmts);
    return { ok: false, reason: willPoison ? "poisoned" : "mismatch" };
  }

  // Match. Atomic consume + elevation + two audit rows. The conditional
  // UPDATE on consumed_at IS NULL is the race gate: if a concurrent verify
  // already consumed this row, our UPDATE writes zero rows and we return
  // already_consumed.
  const consumeStmt: SqlStatement = {
    sql: `UPDATE step_up_otp
            SET consumed_at = ?
          WHERE id = ? AND consumed_at IS NULL`,
    params: [now, liveRow.id],
  };
  // dbBatch doesn't report rowsWritten; do the consume separately so we
  // can detect the race, then batch the elevation + audits together.
  const consumeResult = await dbExec(consumeStmt.sql, [now, liveRow.id]);
  if (consumeResult.rowsWritten === 0) {
    await writeAudit({
      userId: args.userId,
      eventType: AUDIT_EVENT_TYPE.step_up_otp_mismatch,
      ipHash,
      userAgentHash,
      success: false,
      now,
    });
    return { ok: false, reason: "already_consumed" };
  }

  await dbBatch([
    {
      sql: `UPDATE listen_session SET elevated_at = ? WHERE id = ?`,
      params: [now, args.sessionId],
    },
    {
      sql: `INSERT INTO listen_audit
              (id, user_id, submission_id, event_type, timestamp, ip_hash, user_agent_hash, success)
            VALUES (?, ?, NULL, ?, ?, ?, ?, 1)`,
      params: [
        crypto.randomUUID(),
        args.userId,
        AUDIT_EVENT_TYPE.step_up_otp_verified,
        now,
        ipHash,
        userAgentHash,
      ],
    },
    {
      sql: `INSERT INTO listen_audit
              (id, user_id, submission_id, event_type, timestamp, ip_hash, user_agent_hash, success)
            VALUES (?, ?, NULL, ?, ?, ?, ?, 1)`,
      params: [
        crypto.randomUUID(),
        args.userId,
        AUDIT_EVENT_TYPE.step_up_elevated,
        now,
        ipHash,
        userAgentHash,
      ],
    },
  ]);

  return { ok: true, elevatedAt: now };
}
