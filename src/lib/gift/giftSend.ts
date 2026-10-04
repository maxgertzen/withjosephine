import { isValidAuthEmail } from "@/lib/auth/emailValidation";
import { normalizeEmailForm, ownEmailKey } from "@/lib/booking/emailNormalize";
import { sha256Hex } from "@/lib/hmac";

import { resolveGiftState } from "./gifts";
import {
  GIFT_RECIPIENT_NAME_MAX_CHARS,
  type GiftRecipientFieldErrors,
  type GiftSendRequest,
  type GiftSendStatus,
  type GiftSendSummary,
} from "./giftSendContract";
import type { GiftRecord } from "./types";

const BRACES = /[{}]/g;
const RECIPIENT_DIGEST_HEX_CHARS = 16;

export type GiftRecipient = { recipientName: string; recipientEmail: string };

export function giftSendStatus(gift: GiftRecord | null): GiftSendStatus {
  const state = resolveGiftState(gift);
  if (state === "redeemed") return { state: "opened" };
  if (state !== "active" || !gift) return { state: "invalid" };
  if (gift.sendCount >= 2) return { state: "used" };

  const summary: GiftSendSummary = {
    buyerName: gift.buyerFirstName,
    hasNote: gift.note !== null,
    recipientName: gift.recipientName,
  };
  if (gift.sendCount === 0) return { state: "ready", ...summary };
  return { state: "sent", ...summary, lastSentAt: gift.lastSentAt };
}

export async function giftSendIdempotencyKey(
  giftId: string,
  sendNumber: 1 | 2,
  recipientEmail: string,
): Promise<string> {
  const recipientDigest = (await sha256Hex(normalizeEmailForm(recipientEmail))).slice(
    0,
    RECIPIENT_DIGEST_HEX_CHARS,
  );
  return `gift-send/${giftId}/${sendNumber}/${recipientDigest}`;
}

export function validateGiftRecipient(
  request: Pick<GiftSendRequest, "recipientName" | "recipientEmail">,
  buyerEmail: string,
): { values: GiftRecipient } | { fieldErrors: GiftRecipientFieldErrors } {
  const recipientName = request.recipientName.replace(BRACES, "").trim();
  if (!recipientName || recipientName.length > GIFT_RECIPIENT_NAME_MAX_CHARS) {
    return { fieldErrors: { recipientName: "required" } };
  }
  const recipientEmail = request.recipientEmail.trim();
  if (!isValidAuthEmail(recipientEmail)) {
    return { fieldErrors: { recipientEmail: "invalid_email" } };
  }
  if (ownEmailKey(recipientEmail) === ownEmailKey(buyerEmail)) {
    return { fieldErrors: { recipientEmail: "own_email" } };
  }
  return { values: { recipientName, recipientEmail } };
}
