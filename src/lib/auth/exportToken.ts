import { deriveTokenSubkeyHex } from "@/lib/auth/tokenSubkey";
import {
  base64UrlDecodeToBytes,
  base64UrlEncodeBytes,
  bytesToHex,
  sha256Hex,
  signHmacSha256,
  timingSafeStringEqual,
  verifyHmacSha256,
} from "@/lib/hmac";

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

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });
const JTI_BYTE_LENGTH = 16;

function getSecret(): Promise<string> {
  return deriveTokenSubkeyHex("export.v1");
}

function generateJti(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(JTI_BYTE_LENGTH)));
}

function buildCanonicalPayload(args: {
  submissionId: string;
  recipientUserIdHash: string;
  jti: string;
  mintSource: ExportTokenMintSource;
  expMs: number;
}): string {
  const { submissionId, recipientUserIdHash, jti, mintSource, expMs } = args;
  return `${EXPORT_TOKEN_PAYLOAD_PREFIX}${submissionId}:${recipientUserIdHash}:${jti}:${mintSource}:${expMs}`;
}

export async function mintExportToken(args: MintExportTokenArgs): Promise<string> {
  // `:` is the canonical-payload field separator. Refuse any input that would
  // smuggle an extra field on round-trip parse, even though current callers
  // pass opaque ids (Sanity slugs + UUID hex) that never include it.
  if (args.submissionId.includes(":")) {
    throw new Error("submissionId must not contain ':'");
  }
  if (args.jti !== undefined && args.jti.includes(":")) {
    throw new Error("jti must not contain ':'");
  }
  const secret = await getSecret();
  const now = args.now ?? Date.now();
  const ttlMs = args.ttlMs ?? EXPORT_TOKEN_TTL_MS;
  const expMs = now + ttlMs;
  const jti = args.jti ?? generateJti();
  const recipientUserIdHash = await sha256Hex(args.recipientUserId);
  const canonicalPayload = buildCanonicalPayload({
    submissionId: args.submissionId,
    recipientUserIdHash,
    jti,
    mintSource: args.mintSource,
    expMs,
  });
  const sig = await signHmacSha256(secret, canonicalPayload);
  const payloadBytes = TEXT_ENCODER.encode(canonicalPayload);
  return `${base64UrlEncodeBytes(payloadBytes)}.${base64UrlEncodeBytes(sig)}`;
}

export function isValidExportMintSource(value: string): value is ExportTokenMintSource {
  return value === "order_confirmation" || value === "admin_resend";
}

export async function verifyExportToken(
  args: VerifyExportTokenArgs,
): Promise<ExportTokenVerifyResult> {
  const secret = await getSecret();
  const now = args.now ?? Date.now();
  const parts = args.token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return { valid: false, reason: "malformed" };

  const payloadBytes = base64UrlDecodeToBytes(payloadB64);
  if (!payloadBytes) return { valid: false, reason: "malformed" };

  let canonicalPayload: string;
  try {
    canonicalPayload = TEXT_DECODER.decode(payloadBytes);
  } catch {
    return { valid: false, reason: "malformed" };
  }

  // Reject base64url encoding ambiguity by requiring byte-identical re-encode.
  const reencoded = base64UrlEncodeBytes(payloadBytes);
  if (reencoded !== payloadB64) return { valid: false, reason: "malformed" };

  const sigBytes = base64UrlDecodeToBytes(sigB64);
  if (!sigBytes) return { valid: false, reason: "malformed" };

  const sigOk = await verifyHmacSha256(secret, canonicalPayload, sigBytes);
  if (!sigOk) return { valid: false, reason: "bad_signature" };

  if (!canonicalPayload.startsWith(EXPORT_TOKEN_PAYLOAD_PREFIX)) {
    return { valid: false, reason: "malformed" };
  }
  const segments = canonicalPayload.split(":");
  if (segments.length !== 6) return { valid: false, reason: "malformed" };
  const [prefixTag, submissionId, recipientUserIdHash, jti, mintSource, expStr] = segments;
  if (prefixTag !== "export.v1") return { valid: false, reason: "malformed" };
  if (!submissionId || !recipientUserIdHash || !jti || !mintSource || !expStr) {
    return { valid: false, reason: "malformed" };
  }
  if (!isValidExportMintSource(mintSource)) return { valid: false, reason: "malformed" };
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs)) return { valid: false, reason: "malformed" };

  if (expMs <= now) return { valid: false, reason: "expired" };

  return { valid: true, submissionId, recipientUserIdHash, jti, mintSource, expMs };
}

// Constant-time; guards against a token surviving a recipient reassignment.
export async function exportTokenRecipientMatches(
  recipientUserIdHash: string,
  currentRecipientUserId: string,
): Promise<boolean> {
  const currentHash = await sha256Hex(currentRecipientUserId);
  return timingSafeStringEqual(currentHash, recipientUserIdHash);
}
