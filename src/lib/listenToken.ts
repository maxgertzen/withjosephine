import { requireEnv } from "./env";

const HEX_BYTES = 32;
const HEX_LENGTH = HEX_BYTES * 2;
const TEXT_ENCODER = new TextEncoder();

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

async function computeHmacHex(submissionId: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(submissionId));
  return bufferToHex(signature);
}

/**
 * Token format: `{base64url(submissionId)}.{hmacHex}`. Holds the submissionId
 * inside the URL while preventing forgery via HMAC.
 */
export async function signListenToken(submissionId: string): Promise<string> {
  const hmacHex = await computeHmacHex(submissionId);
  return `${base64UrlEncode(submissionId)}.${hmacHex}`;
}

export type ListenTokenVerification =
  | { valid: false }
  | { valid: true; submissionId: string };

export async function verifyListenToken(token: string): Promise<ListenTokenVerification> {
  const dotIndex = token.indexOf(".");
  if (dotIndex <= 0) return { valid: false };
  const idPart = token.slice(0, dotIndex);
  const hmacPart = token.slice(dotIndex + 1);

  const submissionId = base64UrlDecode(idPart);
  if (!submissionId) return { valid: false };

  const signature = hexToBuffer(hmacPart);
  if (!signature) return { valid: false };

  const key = await getSigningKey();
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    TEXT_ENCODER.encode(submissionId),
  );
  return ok ? { valid: true, submissionId } : { valid: false };
}

// Test-only: reset cached key so vi.stubEnv changes apply.
export function __resetListenTokenCache(): void {
  cachedKey = null;
}
