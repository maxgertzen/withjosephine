import "server-only";

import {
  dbBatch,
  dbExec,
  dbQuery,
  type SqlStatement,
  type SqlValue,
} from "@/lib/booking/persistence/sqlClient";
/**
 * Hand-rolled magic-link auth for the customer listen page.
 *
 * Spec: www/MEMORY/WORK/20260509-202915_phase1-magic-link-listen/PRD.md
 * Spike resolution (NO-GO Better Auth, GO hand-rolled): same PRD's Decisions.
 *
 * Identity model: email = user. A repeat customer + a gift recipient share
 * one user record. Sessions are scoped to user.id (not submission.id) at
 * the cookie/JWT level. Submission-scope is enforced per-call by
 * requireListenSession() resolving submission.recipient_user_id and
 * matching it against session.user_id.
 *
 * Flow:
 *   1. Day-7 delivery email links the customer to /listen/[submissionId].
 *   2. No cookie → "send fresh link" form → POST /api/auth/magic-link →
 *      issueMagicLink (user looked up by email).
 *   3. Customer clicks emailed link → confirm-email form (Level 1
 *      hardening: claimedEmail must equal user.email) → redeemMagicLink
 *      → cookie set.
 *   4. Subsequent /listen/[id] + /api/listen/[id]/{audio,pdf} call
 *      requireListenSession to verify session.userId matches the
 *      submission's recipient_user_id.
 *
 * Security properties:
 *   - Tokens stored as SHA-256 hashes only; raw tokens never persist.
 *   - Magic links 24h expiry, single-use (consumed_at).
 *   - Single-use is atomic: conditional UPDATE on consumed_at; concurrent
 *     redeems can't both succeed.
 *   - Per-link mismatch counter caps email-guess attempts at 5 → poisons
 *     the link, defeating the 24h-unlimited-guess brute-force oracle.
 *   - Sessions 7d expiry, scoped per user.
 *   - IP + UA hashed with daily-rotating salt; raw values never persist.
 *   - Cookie name `__Host-` prefixed → strict scope (HTTPS, no subdomains).
 */
import {
  findSubmissionRecipientUserId,
} from "@/lib/booking/submissions";
import { sha256Hex } from "@/lib/hmac";

import { findUserById, normalizeEmail } from "./users";

export const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const COOKIE_NAME = "__Host-listen_session";
export const MISMATCH_LIMIT = 5;

export type AuditEventType =
  | "link_issued"
  | "link_redeemed"
  | "link_expired"
  | "link_already_consumed"
  | "link_invalid"
  | "link_email_mismatch"
  | "link_mismatch_poisoned"
  | "listen_session_started"
  | "listen_session_invalid"
  | "listen_session_revoked"
  | "listen_cross_user_denied"
  | "export_request"
  | "export_throttled"
  | "deletion_request"
  | "admin_auth_failed";

export type RedeemResult =
  | { ok: true; userId: string; sessionId: string; cookieValue: string }
  | {
      ok: false;
      reason: "invalid" | "expired" | "already_consumed" | "email_mismatch";
    };

export type SessionLookup = { userId: string; sessionId: string } | null;

type MagicLinkRow = {
  id: string;
  user_id: string;
  expires_at: number;
  consumed_at: number | null;
  mismatch_count: number;
};

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: number;
  revoked_at: number | null;
};

type AuditContext = {
  ipHash?: string | null;
  userAgentHash?: string | null;
  submissionId?: string | null;
};

function randomToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}


function dailySalt(secret: string, now: number = Date.now()): string {
  const day = Math.floor(now / (24 * 60 * 60 * 1000));
  return `${secret}:${day}`;
}

/**
 * Hash an IP address with a daily-rotating salt. Same IP within a 24h window
 * yields the same hash (enables "same IP brute-forcing this user" forensics)
 * but loses the link across days. Raw IPs never persist to D1.
 */
export async function hashIp(ip: string, secret: string, now?: number): Promise<string> {
  return sha256Hex(`${dailySalt(secret, now)}:${ip}`);
}

export async function hashUserAgent(ua: string): Promise<string> {
  return sha256Hex(ua);
}

export async function issueMagicLink(args: {
  userId: string;
  ipHash?: string | null;
  now?: number;
}): Promise<{ token: string; expiresAt: number }> {
  const now = args.now ?? Date.now();
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = now + MAGIC_LINK_TTL_MS;
  const id = crypto.randomUUID();

  await dbExec(
    `INSERT INTO listen_magic_link (id, user_id, token_hash, expires_at, created_at, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, args.userId, tokenHash, expiresAt, now, args.ipHash ?? null],
  );

  await writeAudit({
    userId: args.userId,
    eventType: "link_issued",
    ipHash: args.ipHash,
    success: true,
    now,
  });

  return { token, expiresAt };
}

export async function redeemMagicLink(args: {
  token: string;
  claimedEmail: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  now?: number;
}): Promise<RedeemResult> {
  const now = args.now ?? Date.now();
  const tokenHash = await sha256Hex(args.token);
  const auditContext: AuditContext = {
    ipHash: args.ipHash,
    userAgentHash: args.userAgentHash,
  };

  const rows = await dbQuery<MagicLinkRow>(
    `SELECT id, user_id, expires_at, consumed_at, mismatch_count
       FROM listen_magic_link
       WHERE token_hash = ? LIMIT 1`,
    [tokenHash],
  );
  const row = rows[0];

  if (!row) {
    await writeAudit({ userId: null, eventType: "link_invalid", success: false, now, ...auditContext });
    return { ok: false, reason: "invalid" };
  }

  if (row.consumed_at !== null) {
    await writeAudit({
      userId: row.user_id,
      eventType: "link_already_consumed",
      success: false,
      now,
      ...auditContext,
    });
    return { ok: false, reason: "already_consumed" };
  }

  // Strict less-than: at expires_at == now the link is treated as still
  // alive on the boundary; one millisecond later it expires. Avoids
  // off-by-one rejection on retry-at-exact-TTL.
  if (row.expires_at < now) {
    await writeAudit({
      userId: row.user_id,
      eventType: "link_expired",
      success: false,
      now,
      ...auditContext,
    });
    return { ok: false, reason: "expired" };
  }

  // Level 1 email-match. Mismatch must NOT consume the link (typo recovery)
  // BUT must increment a per-link counter — at MISMATCH_LIMIT, poison the
  // link by setting consumed_at, defeating the 24h-unlimited-guess oracle.
  // Audit row attributes the failure with user_id=NULL so brute-forcing on
  // Alice's link doesn't fill the audit table with rows misattributed to
  // Alice as the actor.
  const user = await findUserById(row.user_id);
  const claimed = normalizeEmail(args.claimedEmail);
  if (!user || claimed !== user.email) {
    const willPoison = row.mismatch_count + 1 >= MISMATCH_LIMIT;
    await dbExec(
      `UPDATE listen_magic_link
         SET mismatch_count = mismatch_count + 1,
             consumed_at = CASE WHEN ? = 1 THEN ? ELSE consumed_at END
       WHERE id = ?`,
      [willPoison ? 1 : 0, now, row.id],
    );
    await writeAudit({
      userId: null,
      eventType: "link_email_mismatch",
      success: false,
      now,
      ...auditContext,
    });
    if (willPoison) {
      await writeAudit({
        userId: row.user_id,
        eventType: "link_mismatch_poisoned",
        success: false,
        now,
        ...auditContext,
      });
    }
    return { ok: false, reason: "email_mismatch" };
  }

  // Atomic consume: only the caller whose UPDATE actually flips consumed_at
  // proceeds. Concurrent redeems both reach this point with consumed_at=NULL
  // in their SELECT snapshots; only ONE rowsWritten=1 wins.
  const consumeResult = await dbExec(
    `UPDATE listen_magic_link SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL`,
    [now, row.id],
  );
  if (consumeResult.rowsWritten === 0) {
    await writeAudit({
      userId: row.user_id,
      eventType: "link_already_consumed",
      success: false,
      now,
      ...auditContext,
    });
    return { ok: false, reason: "already_consumed" };
  }

  // Session insert + redeem-success audits in one batch — guarantees
  // consume-and-session-emit cohere; no half-redeemed state on D1 hiccup.
  const sessionId = crypto.randomUUID();
  const cookieValue = randomToken();
  const cookieHash = await sha256Hex(cookieValue);
  const sessionExpiresAt = now + SESSION_TTL_MS;

  const auditId1 = crypto.randomUUID();
  const auditId2 = crypto.randomUUID();
  const stmts: SqlStatement[] = [
    {
      sql: `INSERT INTO listen_session
              (id, user_id, token_hash, expires_at, created_at, ip_hash, user_agent_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        sessionId,
        row.user_id,
        cookieHash,
        sessionExpiresAt,
        now,
        args.ipHash ?? null,
        args.userAgentHash ?? null,
      ],
    },
    {
      sql: `INSERT INTO listen_audit
              (id, user_id, submission_id, event_type, timestamp, ip_hash, user_agent_hash, success)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      params: [
        auditId1,
        row.user_id,
        null,
        "link_redeemed",
        now,
        args.ipHash ?? null,
        args.userAgentHash ?? null,
      ],
    },
    {
      sql: `INSERT INTO listen_audit
              (id, user_id, submission_id, event_type, timestamp, ip_hash, user_agent_hash, success)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      params: [
        auditId2,
        row.user_id,
        null,
        "listen_session_started",
        now,
        args.ipHash ?? null,
        args.userAgentHash ?? null,
      ],
    },
  ];
  await dbBatch(stmts);

  return { ok: true, userId: row.user_id, sessionId, cookieValue };
}

export async function getActiveSession(args: {
  cookieValue: string;
  now?: number;
}): Promise<SessionLookup> {
  const now = args.now ?? Date.now();
  if (!args.cookieValue) return null;
  const tokenHash = await sha256Hex(args.cookieValue);

  const rows = await dbQuery<SessionRow>(
    `SELECT id, user_id, expires_at, revoked_at
       FROM listen_session
       WHERE token_hash = ? LIMIT 1`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.revoked_at !== null) return null;
  if (row.expires_at < now) return null;

  return { userId: row.user_id, sessionId: row.id };
}

/**
 * Authoritative gate for listen-page + audio + pdf routes. Returns true ONLY
 * when the cookie maps to an active session AND that session's user is the
 * recipient_user_id of the requested submission.
 *
 * Emits an audit row on EVERY denial path so cross-user probes leave a
 * forensic trail. Pass `audit` with the request's ipHash + userAgentHash;
 * if omitted (e.g. internal callers), audit still writes with hash=NULL.
 *
 * Uses the narrow `findSubmissionRecipientUserId` (vs the full
 * `findSubmissionById`) — keeps the hot path off the SELECT * + JSON.parse
 * cost on every audio Range request.
 */
export async function requireListenSession(args: {
  cookieValue: string;
  submissionId: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  now?: number;
}): Promise<boolean> {
  const session = await getActiveSession({ cookieValue: args.cookieValue, now: args.now });
  if (!session) {
    await writeAudit({
      userId: null,
      submissionId: args.submissionId,
      eventType: "listen_session_invalid",
      ipHash: args.ipHash,
      userAgentHash: args.userAgentHash,
      success: false,
      now: args.now,
    });
    return false;
  }
  const submission = await findSubmissionRecipientUserId(args.submissionId);
  if (!submission?.recipientUserId) {
    await writeAudit({
      userId: session.userId,
      submissionId: args.submissionId,
      eventType: "listen_session_invalid",
      ipHash: args.ipHash,
      userAgentHash: args.userAgentHash,
      success: false,
      now: args.now,
    });
    return false;
  }
  if (session.userId !== submission.recipientUserId) {
    await writeAudit({
      userId: session.userId,
      submissionId: args.submissionId,
      eventType: "listen_cross_user_denied",
      ipHash: args.ipHash,
      userAgentHash: args.userAgentHash,
      success: false,
      now: args.now,
    });
    return false;
  }
  return true;
}

export async function revokeSession(args: {
  sessionId: string;
  userId?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  now?: number;
}): Promise<void> {
  const now = args.now ?? Date.now();
  await dbExec(`UPDATE listen_session SET revoked_at = ? WHERE id = ?`, [now, args.sessionId]);
  await writeAudit({
    userId: args.userId ?? null,
    eventType: "listen_session_revoked",
    ipHash: args.ipHash,
    userAgentHash: args.userAgentHash,
    success: true,
    now,
  });
}

/**
 * Append an audit row. user_id is nullable (e.g. invalid token, email
 * mismatch — both before/without confident user attribution); submission_id
 * is also nullable and populated only when the event is tied to a specific
 * reading.
 */
export async function writeAudit(args: {
  userId: string | null;
  submissionId?: string | null;
  eventType: AuditEventType;
  ipHash?: string | null;
  userAgentHash?: string | null;
  success?: boolean;
  now?: number;
}): Promise<void> {
  const now = args.now ?? Date.now();
  const params: SqlValue[] = [
    crypto.randomUUID(),
    args.userId,
    args.submissionId ?? null,
    args.eventType,
    now,
    args.ipHash ?? null,
    args.userAgentHash ?? null,
    args.success === false ? 0 : 1,
  ];
  await dbExec(
    `INSERT INTO listen_audit
       (id, user_id, submission_id, event_type, timestamp, ip_hash, user_agent_hash, success)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    params,
  );
}
