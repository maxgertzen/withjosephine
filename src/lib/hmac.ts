/**
 * Shared HMAC-SHA256 + base64url + hex helpers used by every signed-payload
 * surface in the app: the cron-auth headers (`booking/cron-auth.ts`), the
 * Sanity sync webhook (`/api/sanity-sync`), the magic-link session module
 * (`auth/listenSession.ts`), and any future receiver. Centralising here
 * keeps the encoding / cache / `crypto.subtle.verify` discipline in one place
 * — receivers never roll their own timing-safe compare or base64url math.
 */

const TEXT_ENCODER = new TextEncoder();

const keyCache = new Map<string, Promise<CryptoKey>>();

/**
 * Cached HMAC-SHA256 CryptoKey for a given secret. Cache is keyed by the
 * secret string itself so test `vi.stubEnv` flips reach a different cache
 * entry without an explicit reset call. Bounded in practice — only a
 * handful of distinct secrets ever exist in process.env.
 */
export function getHmacKey(secret: string): Promise<CryptoKey> {
  let cached = keyCache.get(secret);
  if (cached) return cached;
  cached = crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  keyCache.set(secret, cached);
  return cached;
}

export async function signHmacSha256(secret: string, payload: string): Promise<ArrayBuffer> {
  const key = await getHmacKey(secret);
  return crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(payload));
}

/**
 * Verify an HMAC-SHA256 signature using `crypto.subtle.verify`, which is
 * timing-safe internally. Always prefer this over decoding the signature to
 * a string and string-comparing.
 */
export async function verifyHmacSha256(
  secret: string,
  payload: string,
  signature: BufferSource,
): Promise<boolean> {
  const key = await getHmacKey(secret);
  return crypto.subtle.verify("HMAC", key, signature, TEXT_ENCODER.encode(payload));
}

export function base64UrlEncodeBytes(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function base64UrlDecodeToBytes(encoded: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - (padded.length % 4)) % 4);
    const binary = atob(padded + padding);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function bytesToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

export function hexToBytes(hex: string, expectedByteLength?: number): Uint8Array<ArrayBuffer> | null {
  if (expectedByteLength !== undefined && hex.length !== expectedByteLength * 2) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * SHA-256 hex digest. Shared util — used for daily-rotating IP/UA hashes in
 * listen-session auth and for stable email-hash audit identifiers in the
 * Phase 4 deletion cascade. Unsalted; callers add their own salt when they
 * need rotation (`dailySalt(secret, now)` in listenSession.ts).
 */
export async function sha256Hex(value: string): Promise<string> {
  const data = TEXT_ENCODER.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(digest);
}

/**
 * Constant-time string comparison. Use for shared-secret bearer-token checks
 * where `===` would short-circuit on first mismatch and leak prefix length
 * over network timing. Length mismatch is allowed to short-circuit (a stable
 * secret has a stable length).
 */
export function timingSafeStringEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Test-only: clear cached CryptoKeys. Most tests don't need this since the
// cache is keyed by secret string, but helpful when forcing a re-import.
export function __resetHmacKeyCache() {
  keyCache.clear();
}
