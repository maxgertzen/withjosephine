import {
  base64UrlDecodeToBytes,
  base64UrlEncodeBytes,
  bytesToHex,
  signHmacSha256,
  verifyHmacSha256,
} from "@/lib/hmac";

/**
 * Library-link token primitive. Symmetric in shape to `listenToken.ts` but
 * scoped to the customer's READ-ONLY library at /my-readings, not a single
 * submission's listen page.
 *
 * Differences from the listen-token model:
 *   - Payload binds userId directly (no recipient-hash indirection). The
 *     library is user-scoped, so the token IS user-id-establishing; verify
 *     returns the userId for the redeem route to mint a session against.
 *   - 1-year TTL (vs 30 days). OrderConfirmation emails sit in inboxes for
 *     months; symmetric with the listen-token TTL extension. Library is
 *     read-only, mutations gated by Phase 3 step-up auth.
 *   - mintSource enum has 5 values for forensics: order_confirmation,
 *     day7_delivery, gift_purchase_self_send, gift_purchase_scheduled,
 *     admin_resend.
 *
 * Same crypto + framing: HMAC-SHA-256 over the canonical payload, jti as a
 * 16-byte hex nonce, base64url field separation with a `.` between payload
 * and signature.
 */

export const LIBRARY_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;
export const LIBRARY_TOKEN_PAYLOAD_PREFIX = "library.v1:";

export type LibraryTokenMintSource =
  | "order_confirmation"
  | "day7_delivery"
  | "gift_purchase_self_send"
  | "gift_purchase_scheduled"
  | "admin_resend";

export type MintLibraryTokenArgs = {
  userId: string;
  mintSource: LibraryTokenMintSource;
  ttlMs?: number;
  now?: number;
  jti?: string;
};

export type VerifyLibraryTokenArgs = {
  token: string;
  now?: number;
};

export type LibraryTokenVerifyResult =
  | {
      valid: true;
      userId: string;
      jti: string;
      mintSource: LibraryTokenMintSource;
      expMs: number;
    }
  | {
      valid: false;
      reason: "malformed" | "bad_signature" | "expired";
    };

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });
const JTI_BYTE_LENGTH = 16;

function getSecret(): string {
  const secret = process.env.LIBRARY_TOKEN_SECRET;
  if (!secret) {
    throw new Error("LIBRARY_TOKEN_SECRET is required for library tokens");
  }
  return secret;
}

function generateJti(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(JTI_BYTE_LENGTH)));
}

function buildCanonicalPayload(args: {
  userId: string;
  jti: string;
  mintSource: LibraryTokenMintSource;
  expMs: number;
}): string {
  const { userId, jti, mintSource, expMs } = args;
  return `${LIBRARY_TOKEN_PAYLOAD_PREFIX}${userId}:${jti}:${mintSource}:${expMs}`;
}

export async function mintLibraryToken(args: MintLibraryTokenArgs): Promise<string> {
  // `:` is the canonical-payload field separator. Refuse any input that would
  // smuggle an extra field on round-trip parse. UUIDs (current userId source)
  // never include it.
  if (args.userId.includes(":")) {
    throw new Error("userId must not contain ':'");
  }
  if (args.jti !== undefined && args.jti.includes(":")) {
    throw new Error("jti must not contain ':'");
  }
  const secret = getSecret();
  const now = args.now ?? Date.now();
  const ttlMs = args.ttlMs ?? LIBRARY_TOKEN_TTL_MS;
  const expMs = now + ttlMs;
  const jti = args.jti ?? generateJti();
  const canonicalPayload = buildCanonicalPayload({
    userId: args.userId,
    jti,
    mintSource: args.mintSource,
    expMs,
  });
  const sig = await signHmacSha256(secret, canonicalPayload);
  const payloadBytes = TEXT_ENCODER.encode(canonicalPayload);
  return `${base64UrlEncodeBytes(payloadBytes)}.${base64UrlEncodeBytes(sig)}`;
}

function isValidMintSource(value: string): value is LibraryTokenMintSource {
  return (
    value === "order_confirmation" ||
    value === "day7_delivery" ||
    value === "gift_purchase_self_send" ||
    value === "gift_purchase_scheduled" ||
    value === "admin_resend"
  );
}

export async function verifyLibraryToken(
  args: VerifyLibraryTokenArgs,
): Promise<LibraryTokenVerifyResult> {
  const secret = getSecret();
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

  if (!canonicalPayload.startsWith(LIBRARY_TOKEN_PAYLOAD_PREFIX)) {
    return { valid: false, reason: "malformed" };
  }
  const segments = canonicalPayload.split(":");
  if (segments.length !== 5) return { valid: false, reason: "malformed" };
  const [prefixTag, userId, jti, mintSource, expStr] = segments;
  if (prefixTag !== "library.v1") return { valid: false, reason: "malformed" };
  if (!userId || !jti || !mintSource || !expStr) {
    return { valid: false, reason: "malformed" };
  }
  if (!isValidMintSource(mintSource)) return { valid: false, reason: "malformed" };
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs)) return { valid: false, reason: "malformed" };

  if (expMs <= now) return { valid: false, reason: "expired" };

  return { valid: true, userId, jti, mintSource, expMs };
}
