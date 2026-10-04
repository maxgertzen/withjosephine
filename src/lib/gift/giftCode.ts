import "server-only";

import { requireEnv } from "@/lib/env";
import {
  base64UrlDecodeToBytes,
  base64UrlEncodeBytes,
  bytesToHex,
  signHmacSha256,
  verifyHmacSha256,
} from "@/lib/hmac";

import { GIFT_CODE_ALPHABET, GIFT_CODE_LENGTH } from "./giftCodeFormat";
import type { GiftRecord } from "./types";

const CODE_PURPOSE = "gift.code.v1";
const LOOKUP_PURPOSE = "gift.lookup.v1";
const SEND_PURPOSE = "gift.send.v1";

const MAC_PREFIX_BITS = 64;
const BITS_PER_CHARACTER = 5;
const CODE_BITS = GIFT_CODE_LENGTH * BITS_PER_CHARACTER;
const CHARACTER_MASK = BigInt(GIFT_CODE_ALPHABET.length - 1);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function giftPayload(purpose: string, value: string): string {
  return `${purpose}:${value}`;
}

async function signGiftPayload(purpose: string, value: string): Promise<ArrayBuffer> {
  return signHmacSha256(requireEnv("GIFT_CODE_SECRET"), giftPayload(purpose, value));
}

export async function deriveGiftCode(giftId: string): Promise<string> {
  const mac = await signGiftPayload(CODE_PURPOSE, giftId);
  const codeBits = new DataView(mac).getBigUint64(0) >> BigInt(MAC_PREFIX_BITS - CODE_BITS);
  return Array.from({ length: GIFT_CODE_LENGTH }, (_, position) => {
    const shift = BigInt((GIFT_CODE_LENGTH - 1 - position) * BITS_PER_CHARACTER);
    return GIFT_CODE_ALPHABET[Number((codeBits >> shift) & CHARACTER_MASK)];
  }).join("");
}

export async function giftLookupHash(normalizedCode: string): Promise<string> {
  return bytesToHex(await signGiftPayload(LOOKUP_PURPOSE, normalizedCode));
}

export async function deriveGiftSendToken(giftId: string): Promise<string> {
  const mac = await signGiftPayload(SEND_PURPOSE, giftId);
  return `${giftId}.${base64UrlEncodeBytes(mac)}`;
}

export async function verifyGiftSendToken(token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [giftId, encodedMac] = parts;
  if (!UUID_PATTERN.test(giftId)) return null;
  const mac = base64UrlDecodeToBytes(encodedMac);
  if (!mac) return null;
  const valid = await verifyHmacSha256(
    requireEnv("GIFT_CODE_SECRET"),
    giftPayload(SEND_PURPOSE, giftId),
    mac,
  );
  return valid ? giftId : null;
}

export async function deriveVerifiedGiftCode(
  gift: Pick<GiftRecord, "id" | "lookupHash">,
): Promise<string | null> {
  const code = await deriveGiftCode(gift.id);
  if ((await giftLookupHash(code)) === gift.lookupHash) return code;
  console.error(`[giftCode] derived code does not match the stored lookup hash for gift ${gift.id}`);
  return null;
}
