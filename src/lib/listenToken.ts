import { requireEnv } from "./env";

const HEX_BYTES = 32;
const HEX_LENGTH = HEX_BYTES * 2;
const TEXT_ENCODER = new TextEncoder();
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

let cachedKey: Promise<CryptoKey> | null = null;

function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const secret = requireEnv("LISTEN_TOKEN_SECRET");
  cachedKey = crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return cachedKey;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function hexToBuffer(hex: string): ArrayBuffer | null {
  if (hex.length !== HEX_LENGTH) return null;
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  const buffer = new Uint8Array(HEX_BYTES);
  for (let i = 0; i < HEX_BYTES; i += 1) {
    buffer[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return buffer.buffer;
}

function base64UrlEncode(input: string): string {
  return btoa(input).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(encoded: string): string | null {
  try {
    const padded = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - (padded.length % 4)) % 4);
    return atob(padded + padding);
  } catch {
    return null;
  }
}

function buildSigningPayload(submissionId: string, expiresAtSeconds: number): string {
  return `${submissionId}|${expiresAtSeconds}`;
}

async function computeHmacHex(payload: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(payload));
  return bufferToHex(signature);
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
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = buildSigningPayload(submissionId, expiresAtSeconds);
  const hmacHex = await computeHmacHex(payload);
  return `${base64UrlEncode(submissionId)}.${expiresAtSeconds}.${hmacHex}`;
}

export type ListenTokenVerification =
  | { valid: false; reason: "malformed" | "bad-signature" | "expired" }
  | { valid: true; submissionId: string; expiresAtSeconds: number };

export async function verifyListenToken(token: string): Promise<ListenTokenVerification> {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, reason: "malformed" };
  const [idPart, expiresPart, hmacPart] = parts as [string, string, string];

  const submissionId = base64UrlDecode(idPart);
  if (!submissionId) return { valid: false, reason: "malformed" };

  if (!/^\d+$/.test(expiresPart)) return { valid: false, reason: "malformed" };
  const expiresAtSeconds = Number.parseInt(expiresPart, 10);
  if (!Number.isFinite(expiresAtSeconds)) return { valid: false, reason: "malformed" };

  const signature = hexToBuffer(hmacPart);
  if (!signature) return { valid: false, reason: "malformed" };

  const key = await getSigningKey();
  const payload = buildSigningPayload(submissionId, expiresAtSeconds);
  const ok = await crypto.subtle.verify("HMAC", key, signature, TEXT_ENCODER.encode(payload));
  if (!ok) return { valid: false, reason: "bad-signature" };

  if (Date.now() / 1000 >= expiresAtSeconds) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, submissionId, expiresAtSeconds };
}

// Test-only: reset cached key so vi.stubEnv changes apply.
export function __resetListenTokenCache(): void {
  cachedKey = null;
}
