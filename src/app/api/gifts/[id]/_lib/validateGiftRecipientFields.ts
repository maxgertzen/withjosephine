import { MAX_EMAIL_CHARS } from "@/lib/booking/constants";
import { ownEmailKey } from "@/lib/booking/emailNormalize";
import { stripTemplateTags } from "@/lib/booking/giftPersonas";
import {
  SEND_AT_BOUND_MESSAGE,
  validateSendAtBounds,
} from "@/lib/booking/scheduling/bounds";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_RECIPIENT_NAME_CHARS = 80;

export type FieldError = { field: string; message: string };

export type GiftRecipientFieldsInput = {
  recipientEmail?: string;
  recipientName?: string;
  giftSendAt?: string | null;
};

export type GiftRecipientFieldsCleaned = {
  recipientEmail?: string;
  recipientName?: string;
  giftSendAt?: string | null;
};

export type GiftRecipientFieldsContext = {
  purchaserEmail: string;
  now: Date;
  purchasedAt: Date;
};

export function validateGiftRecipientFields(
  body: GiftRecipientFieldsInput,
  context: GiftRecipientFieldsContext,
): { errors: FieldError[]; cleaned: GiftRecipientFieldsCleaned } {
  const errors: FieldError[] = [];
  const cleaned: GiftRecipientFieldsCleaned = {};

  if (body.recipientEmail !== undefined) {
    const trimmed = body.recipientEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      errors.push({ field: "recipientEmail", message: "Enter a valid recipient email address." });
    } else if (trimmed.length > MAX_EMAIL_CHARS) {
      errors.push({
        field: "recipientEmail",
        message: `Email must be ${MAX_EMAIL_CHARS} characters or fewer.`,
      });
    } else if (ownEmailKey(trimmed) === ownEmailKey(context.purchaserEmail)) {
      errors.push({
        field: "recipientEmail",
        message: "The recipient email can’t be your own.",
      });
    } else {
      cleaned.recipientEmail = trimmed;
    }
  }

  if (body.recipientName !== undefined) {
    const trimmed = stripTemplateTags(body.recipientName.trim());
    if (trimmed.length === 0) {
      errors.push({ field: "recipientName", message: "Recipient name can’t be blank." });
    } else if (trimmed.length > MAX_RECIPIENT_NAME_CHARS) {
      errors.push({
        field: "recipientName",
        message: `Keep it under ${MAX_RECIPIENT_NAME_CHARS} characters.`,
      });
    } else {
      cleaned.recipientName = trimmed;
    }
  }

  if (body.giftSendAt !== undefined) {
    if (body.giftSendAt === null) {
      cleaned.giftSendAt = null;
    } else {
      const verdict = validateSendAtBounds(body.giftSendAt, {
        now: context.now,
        purchasedAt: context.purchasedAt,
      });
      if (!verdict.ok) {
        errors.push({ field: "giftSendAt", message: SEND_AT_BOUND_MESSAGE[verdict.code] });
      } else {
        cleaned.giftSendAt = verdict.sendAtIso;
      }
    }
  }

  return { errors, cleaned };
}
