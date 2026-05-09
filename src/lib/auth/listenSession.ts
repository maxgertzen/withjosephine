/**
 * Hand-rolled magic-link auth for the customer listen page.
 *
 * Spec: www/MEMORY/WORK/20260509-202915_phase1-magic-link-listen/PRD.md
 * Spike resolution (NO-GO Better Auth, GO hand-rolled): same PRD's Decisions.
 *
 * Flow:
 *   1. Day-7 delivery email → POST /api/auth/magic-link → issueMagicLink
 *   2. Customer clicks emailed link → GET /api/auth/magic-link/verify → redeemMagicLink
 *   3. Cookie set; subsequent /listen/[id] + /api/listen/[id]/{audio,pdf} call requireListenSession
 *
 * Security properties:
 *   - Tokens stored as SHA-256 hashes only; raw tokens never persist
 *   - Magic links 24h expiry, single-use (consumed_at)
 *   - Sessions 7d expiry, scoped per submission (no global account model)
 *   - IP + UA hashed with daily-rotating salt; raw values never persist
 *   - Cookie name `__Host-` prefixed → strict scope (HTTPS, no subdomains)
 */

import { dbExec, dbQuery, type SqlValue } from "@/lib/booking/persistence/sqlClient";

export const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const COOKIE_NAME = "__Host-listen_session";

export type AuditEventType =
  | "link_issued"
  | "link_redeemed"
  | "link_expired"
  | "link_already_consumed"
  | "link_invalid"
  | "listen_session_started"
  | "listen_session_invalid"
  | "listen_session_revoked"
  | "export_request"
  | "deletion_request";

export type RedeemResult =
  | { ok: true; submissionId: string; sessionId: string; cookieValue: string }
  | { ok: false; reason: "invalid" | "expired" | "already_consumed" };

export type SessionLookup = { submissionId: string; sessionId: string } | null;

type MagicLinkRow = {
  id: string;
  submission_id: string;
  expires_at: number;
  consumed_at: number | null;
};

type SessionRow = {
  id: string;
  submission_id: string;
  expires_at: number;
  revoked_at: number | null;
};

function randomToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function dailySalt(secret: string, now: number = Date.now()): string {
  const day = Math.floor(now / (24 * 60 * 60 * 1000));
  return `${secret}:${day}`;
}

/**
 * Hash an IP address with a daily-rotating salt. Same IP within a 24h window
 * yields the same hash (enables "same IP brute-forcing this submission" forensics)
 * but loses the link across days. Raw IPs never persist to D1.
 */
export async function hashIp(ip: string, secret: string, now?: number): Promise<string> {
  return sha256Hex(`${dailySalt(secret, now)}:${ip}`);
}

export async function hashUserAgent(ua: string): Promise<string> {
  return sha256Hex(ua);
}

export async function issueMagicLink(args: {
  submissionId: string;
  ipHash?: string | null;
  now?: number;
}): Promise<{ token: string; expiresAt: number }> {
  const now = args.now ?? Date.now();
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = now + MAGIC_LINK_TTL_MS;
  const id = crypto.randomUUID();

  await dbExec(
    `INSERT INTO listen_magic_link (id, submission_id, token_hash, expires_at, created_at, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, args.submissionId, tokenHash, expiresAt, now, args.ipHash ?? null],
  );

  await writeAudit({
    submissionId: args.submissionId,
    eventType: "link_issued",
    ipHash: args.ipHash,
    success: true,
    now,
  });

  return { token, expiresAt };
}

export async function redeemMagicLink(args: {
  token: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  now?: number;
}): Promise<RedeemResult> {
  const now = args.now ?? Date.now();
  const tokenHash = await sha256Hex(args.token);

  const rows = await dbQuery<MagicLinkRow>(
    `SELECT id, submission_id, expires_at, consumed_at
       FROM listen_magic_link
       WHERE token_hash = ? LIMIT 1`,
    [tokenHash],
  );
  const row = rows[0];

  if (!row) {
    await writeAuditUnscoped({ eventType: "link_invalid", ipHash: args.ipHash, now });
    return { ok: false, reason: "invalid" };
  }

  if (row.consumed_at !== null) {
    await writeAudit({
      submissionId: row.submission_id,
      eventType: "link_already_consumed",
      ipHash: args.ipHash,
      success: false,
      now,
    });
    return { ok: false, reason: "already_consumed" };
  }

  if (row.expires_at <= now) {
    await writeAudit({
      submissionId: row.submission_id,
      eventType: "link_expired",
      ipHash: args.ipHash,
      success: false,
      now,
    });
    return { ok: false, reason: "expired" };
  }

  // Mark consumed; create session.
  await dbExec(
    `UPDATE listen_magic_link SET consumed_at = ? WHERE id = ?`,
    [now, row.id],
  );

  await writeAudit({
    submissionId: row.submission_id,
    eventType: "link_redeemed",
    ipHash: args.ipHash,
    userAgentHash: args.userAgentHash,
    success: true,
    now,
  });

  const sessionId = crypto.randomUUID();
  const cookieValue = randomToken();
  const cookieHash = await sha256Hex(cookieValue);
  const sessionExpiresAt = now + SESSION_TTL_MS;

  await dbExec(
    `INSERT INTO listen_session
       (id, submission_id, token_hash, expires_at, created_at, ip_hash, user_agent_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      row.submission_id,
      cookieHash,
      sessionExpiresAt,
      now,
      args.ipHash ?? null,
      args.userAgentHash ?? null,
    ],
  );

  await writeAudit({
    submissionId: row.submission_id,
    eventType: "listen_session_started",
    ipHash: args.ipHash,
    userAgentHash: args.userAgentHash,
    success: true,
    now,
  });

  return { ok: true, submissionId: row.submission_id, sessionId, cookieValue };
}

export async function getActiveSession(args: {
  cookieValue: string;
  now?: number;
}): Promise<SessionLookup> {
  const now = args.now ?? Date.now();
  if (!args.cookieValue) return null;
  const tokenHash = await sha256Hex(args.cookieValue);

  const rows = await dbQuery<SessionRow>(
    `SELECT id, submission_id, expires_at, revoked_at
       FROM listen_session
       WHERE token_hash = ? LIMIT 1`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.revoked_at !== null) return null;
  if (row.expires_at <= now) return null;

  return { submissionId: row.submission_id, sessionId: row.id };
}

/**
 * Authoritative gate for listen-page + audio + pdf routes. Returns true ONLY
 * when the cookie maps to an active session AND that session was minted
 * for the same submissionId. Cross-submission attempts return false.
 */
export async function requireListenSession(args: {
  cookieValue: string;
  submissionId: string;
  now?: number;
}): Promise<boolean> {
  const session = await getActiveSession({ cookieValue: args.cookieValue, now: args.now });
  return session !== null && session.submissionId === args.submissionId;
}

export async function revokeSession(args: {
  sessionId: string;
  now?: number;
}): Promise<void> {
  const now = args.now ?? Date.now();
  await dbExec(`UPDATE listen_session SET revoked_at = ? WHERE id = ?`, [now, args.sessionId]);
}

export async function writeAudit(args: {
  submissionId: string;
  eventType: AuditEventType;
  ipHash?: string | null;
  userAgentHash?: string | null;
  success?: boolean;
  now?: number;
}): Promise<void> {
  const now = args.now ?? Date.now();
  const params: SqlValue[] = [
    crypto.randomUUID(),
    args.submissionId,
    args.eventType,
    now,
    args.ipHash ?? null,
    args.userAgentHash ?? null,
    args.success === false ? 0 : 1,
  ];
  await dbExec(
    `INSERT INTO listen_audit
       (id, submission_id, event_type, timestamp, ip_hash, user_agent_hash, success)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params,
  );
}

// Audit events that aren't tied to a known submission (e.g. invalid token at redeem time).
// Schema requires submission_id NOT NULL — use a sentinel "unknown" id.
async function writeAuditUnscoped(args: {
  eventType: AuditEventType;
  ipHash?: string | null;
  now?: number;
}): Promise<void> {
  await writeAudit({
    submissionId: "__unknown__",
    eventType: args.eventType,
    ipHash: args.ipHash,
    success: false,
    now: args.now,
  });
}
