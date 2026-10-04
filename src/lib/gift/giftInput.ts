import {
  GIFT_BUYER_NAME_MAX_CHARS,
  GIFT_NOTE_MAX_CHARS,
  HONEYPOT_FIELD,
} from "@/lib/booking/constants";

const BRACE_TAG = /\{[^{}]*\}/g;

export type GiftPurchaseRequestBody = {
  readingSlug: string;
  buyerFirstName: string;
  note: string;
  coolingOffConsent: boolean;
  turnstileToken: string;
  [HONEYPOT_FIELD]?: string;
};

export type GiftSheetField = "buyerFirstName" | "note" | "coolingOff";
export type GiftSheetFieldError = "required" | "too_long";
export type GiftSheetFieldErrors = Partial<Record<GiftSheetField, GiftSheetFieldError>>;

export type GiftSheetValues = { buyerFirstName: string; note: string | null };

export function stripBraceTags(text: string): string {
  return text.replace(BRACE_TAG, "");
}

export function parseGiftPurchaseBody(body: unknown): GiftPurchaseRequestBody | null {
  if (typeof body !== "object" || body === null) return null;
  const candidate = body as Record<string, unknown>;
  const honeypot = candidate[HONEYPOT_FIELD];
  const isGiftPurchaseBody =
    typeof candidate.readingSlug === "string" &&
    typeof candidate.buyerFirstName === "string" &&
    typeof candidate.note === "string" &&
    typeof candidate.coolingOffConsent === "boolean" &&
    typeof candidate.turnstileToken === "string" &&
    (honeypot === undefined || typeof honeypot === "string");
  return isGiftPurchaseBody ? (candidate as GiftPurchaseRequestBody) : null;
}

export function validateGiftSheet(
  body: Pick<GiftPurchaseRequestBody, "buyerFirstName" | "note">,
): { values: GiftSheetValues } | { fieldErrors: GiftSheetFieldErrors } {
  const buyerFirstName = stripBraceTags(body.buyerFirstName).trim();
  const note = stripBraceTags(body.note).trim();
  const fieldErrors: GiftSheetFieldErrors = {};
  if (!buyerFirstName) fieldErrors.buyerFirstName = "required";
  else if (buyerFirstName.length > GIFT_BUYER_NAME_MAX_CHARS) fieldErrors.buyerFirstName = "too_long";
  if (note.length > GIFT_NOTE_MAX_CHARS) fieldErrors.note = "too_long";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  return { values: { buyerFirstName, note: note || null } };
}
