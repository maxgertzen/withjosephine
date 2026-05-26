import "server-only";

import type { LibraryTokenMintSource } from "@/lib/auth/libraryToken";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";

/**
 * Single-use ledger for one-tap library-token jti's. INSERT OR IGNORE on the
 * jti PK serializes concurrent redemptions; first caller wins, the rest get
 * `already_redeemed` and fall through silently. mint_source is preserved for
 * forensics across the 5 surfaces that mint library tokens.
 */

export type RecordLibraryRedemptionArgs = {
  jti: string;
  userId: string;
  redeemedAt: number;
  ipHash: string | null;
  mintSource: LibraryTokenMintSource;
};

export type RecordLibraryRedemptionResult =
  | { ok: true }
  | { ok: false; reason: "already_redeemed" };

export async function recordLibraryTokenRedemption(
  args: RecordLibraryRedemptionArgs,
): Promise<RecordLibraryRedemptionResult> {
  const rows = await dbQuery<{ jti: string }>(
    `INSERT OR IGNORE INTO library_token_redemptions
       (jti, user_id, redeemed_at, ip_hash, mint_source)
     VALUES (?, ?, ?, ?, ?)
     RETURNING jti`,
    [args.jti, args.userId, args.redeemedAt, args.ipHash, args.mintSource],
  );

  return rows.length === 0 ? { ok: false, reason: "already_redeemed" } : { ok: true };
}
