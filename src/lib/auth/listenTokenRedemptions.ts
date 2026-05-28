import "server-only";

import type { ListenTokenMintSource } from "@/lib/auth/listenToken";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";

/**
 * Single-use ledger for one-tap listen-token jti's. INSERT OR IGNORE on the
 * jti PK serializes concurrent redemptions; first caller wins, the rest get
 * `already_redeemed` and fall through to the form. mint_source is preserved
 * for forensics (cron_day7 vs admin_resend).
 */

export type RecordRedemptionArgs = {
  jti: string;
  submissionId: string;
  recipientUserId: string;
  redeemedAt: number;
  ipHash: string | null;
  uaHash: string | null;
  mintSource: ListenTokenMintSource;
};

export type RecordRedemptionResult =
  | { ok: true }
  | { ok: false; reason: "already_redeemed" };

export async function recordListenTokenRedemption(
  args: RecordRedemptionArgs,
): Promise<RecordRedemptionResult> {
  const rows = await dbQuery<{ jti: string }>(
    `INSERT OR IGNORE INTO listen_token_redemptions
       (jti, submission_id, recipient_user_id, redeemed_at, ip_hash, ua_hash, mint_source)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING jti`,
    [
      args.jti,
      args.submissionId,
      args.recipientUserId,
      args.redeemedAt,
      args.ipHash,
      args.uaHash,
      args.mintSource,
    ],
  );

  return rows.length === 0 ? { ok: false, reason: "already_redeemed" } : { ok: true };
}
