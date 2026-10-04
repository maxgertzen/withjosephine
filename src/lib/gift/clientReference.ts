export const GIFT_CLIENT_REFERENCE_PREFIX = "gift_";

export function giftClientReferenceId(giftId: string): string {
  return `${GIFT_CLIENT_REFERENCE_PREFIX}${giftId}`;
}

export function giftIdFromClientReferenceId(ref: string): string | null {
  if (!ref.startsWith(GIFT_CLIENT_REFERENCE_PREFIX)) return null;
  return ref.slice(GIFT_CLIENT_REFERENCE_PREFIX.length) || null;
}
