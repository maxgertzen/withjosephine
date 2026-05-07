import { requireEnv } from "./env";
import {
  __resetHmacKeyCache,
  base64UrlDecodeToBytes,
  base64UrlEncodeBytes,
  bytesToHex,
  hexToBytes,
  signHmacSha256,
  verifyHmacSha256,
} from "./hmac";

const HEX_BYTES = 32;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function buildSigningPayload(submissionId: string, expiresAtSeconds: number) {
  return `${submissionId}|${expiresAtSeconds}`;
}

/**
 * Token format: `{base64url(submissionId)}.{expiresAtSeconds}.{hmacHex}`.
 * The HMAC covers `${submissionId}|${expiresAtSeconds}` so neither part can
 * be swapped without breaking the signature.
 *
 * Default TTL is one year — generous for a "your reading is ready" link
 * that customers may bookmark, short enough that a leaked URL has bounded
 * lifetime. Pass `ttlSeconds` to override (e.g. tighter for one-off shares).
 */
export async function signListenToken(
  submissionId: string,
  ttlSeconds: number = ONE_YEAR_SECONDS,
): Promise<string> {
  const secret = requireEnv("LISTEN_TOKEN_SECRET");
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = buildSigningPayload(submissionId, expiresAtSeconds);
  const sig = await signHmacSha256(secret, payload);
  const idEncoded = base64UrlEncodeBytes(TEXT_ENCODER.encode(submissionId));
  return `${idEncoded}.${expiresAtSeconds}.${bytesToHex(sig)}`;
}

export type ListenTokenVerification =
  | { valid: false; reason: "malformed" | "bad-signature" | "expired" }
  | { valid: true; submissionId: string; expiresAtSeconds: number };

export async function verifyListenToken(token: string): Promise<ListenTokenVerification> {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, reason: "malformed" };
  const [idPart, expiresPart, hmacPart] = parts as [string, string, string];

  const idBytes = base64UrlDecodeToBytes(idPart);
  if (!idBytes) return { valid: false, reason: "malformed" };
  const submissionId = TEXT_DECODER.decode(idBytes);

  if (!/^\d+$/.test(expiresPart)) return { valid: false, reason: "malformed" };
  const expiresAtSeconds = Number.parseInt(expiresPart, 10);
  if (!Number.isFinite(expiresAtSeconds)) return { valid: false, reason: "malformed" };

  const signature = hexToBytes(hmacPart, HEX_BYTES);
  if (!signature) return { valid: false, reason: "malformed" };

  const secret = requireEnv("LISTEN_TOKEN_SECRET");
  const payload = buildSigningPayload(submissionId, expiresAtSeconds);
  const ok = await verifyHmacSha256(secret, payload, signature);
  if (!ok) return { valid: false, reason: "bad-signature" };

  if (Date.now() / 1000 >= expiresAtSeconds) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, submissionId, expiresAtSeconds };
}

// Test-only: kept as a thin alias so existing test imports keep working.
export function __resetListenTokenCache() {
  __resetHmacKeyCache();
}
