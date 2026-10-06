import {
  GIFT_BUYER_NAME_MAX_CHARS,
  GIFT_NOTE_MAX_CHARS,
  HONEYPOT_FIELD,
} from "@/lib/booking/constants";

const BRACE_TAG = /\{[^{}]*\}/g;

type GiftSheetInput = { buyerFirstName: string; note: string };

export type GiftPurchaseRequestBody = GiftSheetInput & {
  readingSlug: string;
  coolingOffConsent: boolean;
  turnstileToken: string;
  [HONEYPOT_FIELD]?: string;
};

export type GiftNoteRequest = GiftSheetInput & { token: string };

export type GiftSheetField = "buyerFirstName" | "note" | "coolingOff";
export type GiftSheetFieldError = "required" | "too_long";
export type GiftSheetFieldErrors = Partial<Record<GiftSheetField, GiftSheetFieldError>>;

export type GiftSheetValues = { buyerFirstName: string; note: string | null };

export function stripBraceTags(text: string): string {
  return text.replace(BRACE_TAG, "");
}

function hasGiftSheetInput(body: unknown): body is Record<string, unknown> & GiftSheetInput {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.buyerFirstName === "string" && typeof candidate.note === "string";
}

export function parseGiftPurchaseBody(body: unknown): GiftPurchaseRequestBody | null {
  if (!hasGiftSheetInput(body)) return null;
  const honeypot = body[HONEYPOT_FIELD];
  const isGiftPurchaseBody =
    typeof body.readingSlug === "string" &&
    typeof body.coolingOffConsent === "boolean" &&
    typeof body.turnstileToken === "string" &&
    (honeypot === undefined || typeof honeypot === "string");
  return isGiftPurchaseBody ? (body as GiftPurchaseRequestBody) : null;
}

export function parseGiftNoteRequest(body: unknown): GiftNoteRequest | null {
  return hasGiftSheetInput(body) && typeof body.token === "string" ? (body as GiftNoteRequest) : null;
}

export function validateGiftSheet(
  body: GiftSheetInput,
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
