import { MAX_EMAIL_CHARS } from "@/lib/booking/constants";
import { ownEmailKey } from "@/lib/booking/emailNormalize";
import { stripTemplateTags } from "@/lib/booking/giftPersonas";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_RECIPIENT_NAME_CHARS = 80;
export const SEND_AT_MAX_DAYS = 365;
export const MIN_SEND_AT_OFFSET_MS = 5 * 60 * 1000;

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

export function validateGiftRecipientFields(
  body: GiftRecipientFieldsInput,
  purchaserEmail: string,
  now: Date,
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
    } else if (ownEmailKey(trimmed) === ownEmailKey(purchaserEmail)) {
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
      const sendAt = new Date(body.giftSendAt);
      if (Number.isNaN(sendAt.getTime())) {
        errors.push({ field: "giftSendAt", message: "Invalid date." });
      } else {
        const minAt = now.getTime() + MIN_SEND_AT_OFFSET_MS;
        const maxAt = new Date(now);
        maxAt.setUTCDate(maxAt.getUTCDate() + SEND_AT_MAX_DAYS);
        if (sendAt.getTime() < minAt) {
          errors.push({
            field: "giftSendAt",
            message: "Send-at must be at least five minutes from now.",
          });
        } else if (sendAt.getTime() > maxAt.getTime()) {
          errors.push({
            field: "giftSendAt",
            message: `Send-at must be within ${SEND_AT_MAX_DAYS} days.`,
          });
        } else {
          cleaned.giftSendAt = sendAt.toISOString();
        }
      }
    }
  }

  return { errors, cleaned };
}
