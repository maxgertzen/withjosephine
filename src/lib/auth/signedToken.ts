import { deriveTokenSubkeyHex, type TokenSubkeyPurpose } from "@/lib/auth/tokenSubkey";
import {
  base64UrlDecodeToBytes,
  base64UrlEncodeBytes,
  bytesToHex,
  sha256Hex,
  signHmacSha256,
  verifyHmacSha256,
} from "@/lib/hmac";

// Shared codec for the HMAC-SHA256 tokens whose canonical payload is
// `<purpose>:<submissionId>:<recipientUserIdHash>:<jti>:<mintSource>:<expMs>`,
// base64url(payload).base64url(sig). listenToken and exportToken differ only in
// purpose, TTL, and mint-source enum; the recipient-hash binding is verified by
// each caller (in-pass for listen, deferred for export) against the returned hash.

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });
const JTI_BYTE_LENGTH = 16;

export type SignedTokenFields<MintSource extends string> = {
  submissionId: string;
  recipientUserIdHash: string;
  jti: string;
  mintSource: MintSource;
  expMs: number;
};

export type SignedTokenMintArgs<MintSource extends string> = {
  submissionId: string;
  recipientUserId: string;
  mintSource: MintSource;
  ttlMs?: number;
  now?: number;
  jti?: string;
};

export type SignedTokenVerifyResult<MintSource extends string> =
  | ({ valid: true } & SignedTokenFields<MintSource>)
  | { valid: false; reason: "malformed" | "bad_signature" | "expired" };

export type SignedTokenCodec<MintSource extends string> = {
  mint(args: SignedTokenMintArgs<MintSource>): Promise<string>;
  verify(token: string, now?: number): Promise<SignedTokenVerifyResult<MintSource>>;
};

export function createSignedTokenCodec<MintSource extends string>(config: {
  purpose: TokenSubkeyPurpose;
  defaultTtlMs: number;
  isValidMintSource: (value: string) => value is MintSource;
}): SignedTokenCodec<MintSource> {
  const { purpose, defaultTtlMs, isValidMintSource } = config;
  const payloadPrefix = `${purpose}:`;
  const getSecret = () => deriveTokenSubkeyHex(purpose);

  function buildCanonicalPayload(fields: SignedTokenFields<MintSource>): string {
    const { submissionId, recipientUserIdHash, jti, mintSource, expMs } = fields;
    return `${payloadPrefix}${submissionId}:${recipientUserIdHash}:${jti}:${mintSource}:${expMs}`;
  }

  async function mint(args: SignedTokenMintArgs<MintSource>): Promise<string> {
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
    const ttlMs = args.ttlMs ?? defaultTtlMs;
    const expMs = now + ttlMs;
    const jti = args.jti ?? bytesToHex(crypto.getRandomValues(new Uint8Array(JTI_BYTE_LENGTH)));
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

  async function verify(
    token: string,
    now: number = Date.now(),
  ): Promise<SignedTokenVerifyResult<MintSource>> {
    const secret = await getSecret();
    const parts = token.split(".");
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

    if (!canonicalPayload.startsWith(payloadPrefix)) {
      return { valid: false, reason: "malformed" };
    }
    const segments = canonicalPayload.split(":");
    if (segments.length !== 6) return { valid: false, reason: "malformed" };
    const [prefixTag, submissionId, recipientUserIdHash, jti, mintSource, expStr] = segments;
    if (prefixTag !== purpose) return { valid: false, reason: "malformed" };
    if (!submissionId || !recipientUserIdHash || !jti || !mintSource || !expStr) {
      return { valid: false, reason: "malformed" };
    }
    if (!isValidMintSource(mintSource)) return { valid: false, reason: "malformed" };
    const expMs = Number(expStr);
    if (!Number.isFinite(expMs)) return { valid: false, reason: "malformed" };

    if (expMs <= now) return { valid: false, reason: "expired" };

    return { valid: true, submissionId, recipientUserIdHash, jti, mintSource, expMs };
  }

  return { mint, verify };
}
