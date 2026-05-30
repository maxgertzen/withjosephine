import "server-only";

import { deriveTokenSubkeyHex } from "@/lib/auth/tokenSubkey";
import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";
import {
  base64UrlDecodeToBytes,
  base64UrlEncodeBytes,
  signHmacSha256,
  verifyHmacSha256,
} from "@/lib/hmac";

export const NEW_DEVICE_REVOKE_TOKEN_TTL_MS = 15 * 60 * 1000;
export const NEW_DEVICE_REVOKE_PAYLOAD_PREFIX = "new_device_revoke.v1:";

export type BaselineLookupResult = {
  baselineUaHash: string | null;
};

export async function findBaselineUaHash(args: {
  submissionId: string;
  recipientUserId: string;
}): Promise<BaselineLookupResult> {
  const rows = await dbQuery<{ ua_hash: string | null; redeemed_at: number }>(
    `SELECT ua_hash, redeemed_at FROM listen_token_redemptions
       WHERE submission_id = ? AND ua_hash IS NOT NULL
     UNION ALL
     SELECT ua_hash, redeemed_at FROM library_token_redemptions
       WHERE user_id = ? AND ua_hash IS NOT NULL
     ORDER BY redeemed_at ASC
     LIMIT 1`,
    [args.submissionId, args.recipientUserId],
  );
  const first = rows[0];
  return { baselineUaHash: first?.ua_hash ?? null };
}

export type RecordNotificationResult =
  | { ok: true }
  | { ok: false; reason: "already_notified" };

export async function recordNewDeviceNotification(args: {
  submissionId: string;
  uaHash: string;
  notifiedAt: number;
}): Promise<RecordNotificationResult> {
  const rows = await dbQuery<{ submission_id: string }>(
    `INSERT OR IGNORE INTO listen_device_notifications
       (submission_id, ua_hash, notified_at)
     VALUES (?, ?, ?)
     RETURNING submission_id`,
    [args.submissionId, args.uaHash, args.notifiedAt],
  );
  return rows.length === 0
    ? { ok: false, reason: "already_notified" }
    : { ok: true };
}

export type NewDeviceGateInput = {
  baselineUaHash: string | null;
  currentUaHash: string | null;
};

export type NewDeviceGateResult =
  | { fire: true; uaHash: string }
  | { fire: false; reason: "no_current_ua" | "no_baseline" | "same_device" };

export function gateNewDeviceNotice(input: NewDeviceGateInput): NewDeviceGateResult {
  if (!input.currentUaHash) return { fire: false, reason: "no_current_ua" };
  if (!input.baselineUaHash) return { fire: false, reason: "no_baseline" };
  if (input.baselineUaHash === input.currentUaHash) {
    return { fire: false, reason: "same_device" };
  }
  return { fire: true, uaHash: input.currentUaHash };
}

type RevokeTokenPayload = {
  recipientUserId: string;
  submissionId: string;
  expMs: number;
};

const TEXT_ENCODER = new TextEncoder();

async function getRevokeSecret(): Promise<string> {
  return deriveTokenSubkeyHex("new_device_revoke.v1");
}

function buildCanonical(payload: RevokeTokenPayload): string {
  return `${NEW_DEVICE_REVOKE_PAYLOAD_PREFIX}${payload.recipientUserId}:${payload.submissionId}:${payload.expMs}`;
}

export async function mintNewDeviceRevokeToken(args: {
  recipientUserId: string;
  submissionId: string;
  ttlMs?: number;
  now?: number;
}): Promise<string> {
  if (args.recipientUserId.includes(":")) {
    throw new Error("recipientUserId must not contain ':'");
  }
  if (args.submissionId.includes(":")) {
    throw new Error("submissionId must not contain ':'");
  }
  const now = args.now ?? Date.now();
  const ttlMs = args.ttlMs ?? NEW_DEVICE_REVOKE_TOKEN_TTL_MS;
  const expMs = now + ttlMs;
  const canonical = buildCanonical({
    recipientUserId: args.recipientUserId,
    submissionId: args.submissionId,
    expMs,
  });
  const secret = await getRevokeSecret();
  const signature = await signHmacSha256(secret, canonical);
  const payloadBytes = TEXT_ENCODER.encode(canonical);
  return `${base64UrlEncodeBytes(payloadBytes)}.${base64UrlEncodeBytes(signature)}`;
}

export type VerifyRevokeTokenResult =
  | { valid: true; recipientUserId: string; submissionId: string; expMs: number }
  | { valid: false; reason: "malformed" | "bad_signature" | "expired" };

export async function verifyNewDeviceRevokeToken(args: {
  token: string;
  now?: number;
}): Promise<VerifyRevokeTokenResult> {
  const now = args.now ?? Date.now();
  const dotIndex = args.token.indexOf(".");
  if (dotIndex < 0) return { valid: false, reason: "malformed" };
  const payloadPart = args.token.slice(0, dotIndex);
  const signaturePart = args.token.slice(dotIndex + 1);

  const payloadBytes = base64UrlDecodeToBytes(payloadPart);
  const signatureBytes = base64UrlDecodeToBytes(signaturePart);
  if (!payloadBytes || !signatureBytes) {
    return { valid: false, reason: "malformed" };
  }

  let canonical: string;
  try {
    canonical = new TextDecoder("utf-8", { fatal: true }).decode(payloadBytes);
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (!canonical.startsWith(NEW_DEVICE_REVOKE_PAYLOAD_PREFIX)) {
    return { valid: false, reason: "malformed" };
  }
  const fields = canonical.slice(NEW_DEVICE_REVOKE_PAYLOAD_PREFIX.length).split(":");
  if (fields.length !== 3) return { valid: false, reason: "malformed" };
  const [recipientUserId, submissionId, expMsRaw] = fields;
  const expMs = Number(expMsRaw);
  if (!Number.isFinite(expMs) || expMs <= 0) {
    return { valid: false, reason: "malformed" };
  }

  const secret = await getRevokeSecret();
  const signatureOk = await verifyHmacSha256(secret, canonical, signatureBytes);
  if (!signatureOk) return { valid: false, reason: "bad_signature" };

  if (expMs < now) return { valid: false, reason: "expired" };

  return { valid: true, recipientUserId, submissionId, expMs };
}

export async function revokeAllSessionsForUser(args: {
  userId: string;
  now?: number;
}): Promise<{ revokedCount: number }> {
  const now = args.now ?? Date.now();
  const result = await dbExec(
    `UPDATE listen_session
       SET revoked_at = ?, elevated_at = NULL
       WHERE user_id = ? AND revoked_at IS NULL`,
    [now, args.userId],
  );
  return { revokedCount: result.rowsWritten };
}

export type MaybeFireNewDeviceNoticeInput = {
  submissionId: string;
  recipientUserId: string;
  currentUaHash: string | null;
  now?: number;
};

export type MaybeFireNewDeviceNoticeResult =
  | { fired: true; uaHash: string }
  | { fired: false; reason: "no_current_ua" | "no_baseline" | "same_device" | "already_notified" | "db_error" };

export async function maybeRecordNewDeviceForSubmission(
  input: MaybeFireNewDeviceNoticeInput,
): Promise<MaybeFireNewDeviceNoticeResult> {
  const now = input.now ?? Date.now();
  try {
    const { baselineUaHash } = await findBaselineUaHash({
      submissionId: input.submissionId,
      recipientUserId: input.recipientUserId,
    });
    const gate = gateNewDeviceNotice({
      baselineUaHash,
      currentUaHash: input.currentUaHash,
    });
    if (!gate.fire) return { fired: false, reason: gate.reason };

    const record = await recordNewDeviceNotification({
      submissionId: input.submissionId,
      uaHash: gate.uaHash,
      notifiedAt: now,
    });
    if (!record.ok) return { fired: false, reason: "already_notified" };
    return { fired: true, uaHash: gate.uaHash };
  } catch (err) {
    console.error("[new-device-notice] DB error, skipping send", err);
    return { fired: false, reason: "db_error" };
  }
}
