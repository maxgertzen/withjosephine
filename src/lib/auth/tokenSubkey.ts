import { bytesToHex } from "@/lib/hmac";

const TEXT_ENCODER = new TextEncoder();
const SALT = TEXT_ENCODER.encode("withjosephine.com.auth-token.v1");
const INFO_PREFIX = "josephine.auth-token-subkey.";
const SUBKEY_BIT_LENGTH = 256;

export type TokenSubkeyPurpose =
  | "listen.v1"
  | "library.v1"
  | "stepup.v1"
  | "new_device_revoke.v1";

export async function deriveTokenSubkeyHex(purpose: TokenSubkeyPurpose): Promise<string> {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("AUTH_TOKEN_SECRET is required for auth tokens");
  }

  const ikm = TEXT_ENCODER.encode(secret);
  const masterKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const info = TEXT_ENCODER.encode(INFO_PREFIX + purpose);
  const subkeyBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: SALT, info },
    masterKey,
    SUBKEY_BIT_LENGTH,
  );

  return bytesToHex(new Uint8Array(subkeyBits));
}
