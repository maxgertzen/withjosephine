export const GIFT_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const GIFT_CODE_LENGTH = 12;

const GIFT_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{12}$/;
const DISPLAY_GROUP = /.{1,4}/g;
const GIFT_SEND_PATH = "/gift/send";

export function normalizeGiftCode(raw: string): string | null {
  const candidate = raw
    .replace(/[\s-]/g, "")
    .toUpperCase()
    .replaceAll("O", "0")
    .replace(/[IL]/g, "1");
  return GIFT_CODE_PATTERN.test(candidate) ? candidate : null;
}

export function formatGiftCode(code: string): string {
  return (code.match(DISPLAY_GROUP) ?? []).join("-");
}

export function giftPath(code: string): string {
  return `/gift/${code}`;
}

export function giftSendPath(token: string): string {
  return `${GIFT_SEND_PATH}#${token}`;
}

export function parseGiftSendFragment(hash: string): string | null {
  const token = hash.startsWith("#") ? hash.slice(1) : hash;
  return token || null;
}
