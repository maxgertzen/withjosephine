import { createSignedTokenCodec } from "@/lib/auth/signedToken";
import { sha256Hex, timingSafeStringEqual } from "@/lib/hmac";

export const LISTEN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const LISTEN_TOKEN_PAYLOAD_PREFIX = "listen.v1:";

export type ListenTokenMintSource = "cron_day7" | "admin_resend";

export type MintListenTokenArgs = {
  submissionId: string;
  recipientUserId: string;
  mintSource: ListenTokenMintSource;
  ttlMs?: number;
  now?: number;
  jti?: string;
};

export type VerifyListenTokenArgs = {
  token: string;
  currentRecipientUserId: string;
  now?: number;
};

export type ListenTokenVerifyResult =
  | {
      valid: true;
      submissionId: string;
      jti: string;
      mintSource: ListenTokenMintSource;
      expMs: number;
    }
  | {
      valid: false;
      reason: "malformed" | "bad_signature" | "expired" | "recipient_changed";
    };

export function isValidMintSource(value: string): value is ListenTokenMintSource {
  return value === "cron_day7" || value === "admin_resend";
}

const codec = createSignedTokenCodec<ListenTokenMintSource>({
  purpose: "listen.v1",
  defaultTtlMs: LISTEN_TOKEN_TTL_MS,
  isValidMintSource,
});

export function mintListenToken(args: MintListenTokenArgs): Promise<string> {
  return codec.mint(args);
}

export async function verifyListenToken(
  args: VerifyListenTokenArgs,
): Promise<ListenTokenVerifyResult> {
  const result = await codec.verify(args.token, args.now);
  if (!result.valid) return { valid: false, reason: result.reason };

  // The listen token carries the submissionId in the request URL, so the
  // recipient binding is checked here in one pass (unlike the export flow).
  const currentHash = await sha256Hex(args.currentRecipientUserId);
  if (!timingSafeStringEqual(currentHash, result.recipientUserIdHash)) {
    return { valid: false, reason: "recipient_changed" };
  }

  return {
    valid: true,
    submissionId: result.submissionId,
    jti: result.jti,
    mintSource: result.mintSource,
    expMs: result.expMs,
  };
}
