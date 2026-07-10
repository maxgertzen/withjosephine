import { createSignedTokenCodec } from "@/lib/auth/signedToken";
import { sha256Hex, timingSafeStringEqual } from "@/lib/hmac";

// One-year TTL: the customer's own-order GDPR export link, live for the order's life.
export const EXPORT_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;
export const EXPORT_TOKEN_PAYLOAD_PREFIX = "export.v1:";

export type ExportTokenMintSource = "order_confirmation" | "admin_resend";

export type MintExportTokenArgs = {
  submissionId: string;
  recipientUserId: string;
  mintSource: ExportTokenMintSource;
  ttlMs?: number;
  now?: number;
  jti?: string;
};

export type VerifyExportTokenArgs = {
  token: string;
  now?: number;
};

// The recipient is bound as a SHA-256 hash inside the signed payload. Unlike the
// listen token (whose submissionId comes from the request URL, so it can check
// the recipient in one pass), the export flow learns the submissionId *from* the
// token, then looks up the order to obtain the current recipient. So verify
// returns the bound `recipientUserIdHash` and the caller confirms the binding
// with `exportTokenRecipientMatches` after resolving the order.
export type ExportTokenVerifyResult =
  | {
      valid: true;
      submissionId: string;
      recipientUserIdHash: string;
      jti: string;
      mintSource: ExportTokenMintSource;
      expMs: number;
    }
  | {
      valid: false;
      reason: "malformed" | "bad_signature" | "expired";
    };

export function isValidExportMintSource(value: string): value is ExportTokenMintSource {
  return value === "order_confirmation" || value === "admin_resend";
}

const codec = createSignedTokenCodec<ExportTokenMintSource>({
  purpose: "export.v1",
  defaultTtlMs: EXPORT_TOKEN_TTL_MS,
  isValidMintSource: isValidExportMintSource,
});

export function mintExportToken(args: MintExportTokenArgs): Promise<string> {
  return codec.mint(args);
}

export function verifyExportToken(
  args: VerifyExportTokenArgs,
): Promise<ExportTokenVerifyResult> {
  return codec.verify(args.token, args.now);
}

// Constant-time; guards against a token surviving a recipient reassignment.
export async function exportTokenRecipientMatches(
  recipientUserIdHash: string,
  currentRecipientUserId: string,
): Promise<boolean> {
  const currentHash = await sha256Hex(currentRecipientUserId);
  return timingSafeStringEqual(currentHash, recipientUserIdHash);
}
