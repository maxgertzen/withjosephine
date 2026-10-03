import { createSignedTokenCodec } from "@/lib/auth/signedToken";
import { sha256Hex, timingSafeStringEqual } from "@/lib/hmac";

export const LISTEN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const LISTEN_TOKEN_PAYLOAD_PREFIX = "listen.v1:";

export type ListenTokenMintSource = "reading_delivery" | "admin_resend";

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

const LEGACY_READING_DELIVERY_MINT_SOURCE = "cron_day7";

type SignedListenTokenMintSource =
  | ListenTokenMintSource
  | typeof LEGACY_READING_DELIVERY_MINT_SOURCE;

export function isValidMintSource(value: string): value is ListenTokenMintSource {
  return value === "reading_delivery" || value === "admin_resend";
}

function isSignedMintSource(value: string): value is SignedListenTokenMintSource {
  return isValidMintSource(value) || value === LEGACY_READING_DELIVERY_MINT_SOURCE;
}

function currentMintSource(signed: SignedListenTokenMintSource): ListenTokenMintSource {
  return signed === LEGACY_READING_DELIVERY_MINT_SOURCE ? "reading_delivery" : signed;
}

const codec = createSignedTokenCodec<SignedListenTokenMintSource>({
  purpose: "listen.v1",
  defaultTtlMs: LISTEN_TOKEN_TTL_MS,
  isValidMintSource: isSignedMintSource,
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
    mintSource: currentMintSource(result.mintSource),
    expMs: result.expMs,
  };
}
