import "server-only";

import { dbQuery, type SqlValue } from "@/lib/booking/persistence/sqlClient";

/**
 * Single-use ledger for one-tap listen-token jti's.
 *
 * Spec: MEMORY/WORK/20260526-060559_implement-epic-23ctexvw-phase-1/PRD.md
 * (ISC-17 to ISC-20). Storage: migrations/0014_listen_token_redemptions.sql.
 *
 * Invariants:
 *   - jti is PRIMARY KEY; INSERT OR IGNORE makes recording atomic.
 *   - First caller wins (ok=true). Every subsequent call with the same jti
 *     returns ok=false / "already_redeemed" (the token is single-use).
 *   - mint_source distinguishes cron_day7 (automated delivery) from
 *     admin_resend (Becky resending via Sanity), preserved for forensics.
 */

export type MintSource = "cron_day7" | "admin_resend";

export type RecordRedemptionArgs = {
  jti: string;
  submissionId: string;
  recipientUserId: string;
  redeemedAt: number;
  ipHash: string | null;
  mintSource: MintSource;
};

export type RecordRedemptionResult =
  | { ok: true }
  | { ok: false; reason: "already_redeemed" };

export async function recordListenTokenRedemption(
  args: RecordRedemptionArgs,
): Promise<RecordRedemptionResult> {
  // INSERT OR IGNORE makes the write atomic: when jti already exists, the
  // statement is a no-op, RETURNING yields zero rows, and we surface
  // already_redeemed. The first caller's row wins; concurrent callers
  // racing on the same jti can't both observe ok=true.
  const params: ReadonlyArray<SqlValue> = [
    args.jti,
    args.submissionId,
    args.recipientUserId,
    args.redeemedAt,
    args.ipHash,
    args.mintSource,
  ];

  const rows = await dbQuery<{ jti: string }>(
    `INSERT OR IGNORE INTO listen_token_redemptions
       (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, mint_source)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING jti`,
    params,
  );

  if (rows.length === 0) {
    return { ok: false, reason: "already_redeemed" };
  }
  return { ok: true };
}
