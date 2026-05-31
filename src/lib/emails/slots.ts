export type EmailTemplateKey =
  | "emailOrderConfirmation"
  | "emailDay7Delivery"
  | "emailGiftPurchaseConfirmationSelfSend"
  | "emailGiftPurchaseConfirmationScheduled"
  | "emailGiftClaim"
  | "emailGiftClaimReminder"
  | "emailMagicLink"
  | "emailMagicLinkLibrary"
  | "emailPrivacyExport"
  | "emailRecipientIntakeReceived"
  | "emailStepUpOtp"
  | "emailNewDeviceNotice";

export const EMAIL_ALLOWED_SLOTS: Record<EmailTemplateKey, readonly string[]> = {
  emailOrderConfirmation: ["firstName", "readingName", "readingPriceDisplay", "amountPaidDisplay"],
  emailDay7Delivery: ["firstName", "readingName", "readingPriceDisplay", "listenUrl"],
  emailGiftPurchaseConfirmationSelfSend: [
    "purchaserFirstName",
    "recipientName",
    "readingName",
    "readingPriceDisplay",
    "amountPaidDisplay",
    "giftMessage",
    "myGiftsUrl",
    "claimUrl",
  ],
  emailGiftPurchaseConfirmationScheduled: [
    "purchaserFirstName",
    "recipientName",
    "readingName",
    "readingPriceDisplay",
    "amountPaidDisplay",
    "giftMessage",
    "myGiftsUrl",
    "sendAtDisplay",
  ],
  emailGiftClaim: [
    "purchaserFirstName",
    "recipientName",
    "readingName",
    "readingPriceDisplay",
    "giftMessage",
    "claimUrl",
  ],
  emailGiftClaimReminder: [
    "purchaserFirstName",
    "recipientName",
    "readingName",
    "readingPriceDisplay",
    "giftMessage",
  ],
  emailMagicLink: ["magicLinkUrl", "firstName", "readingName", "readingPriceDisplay"],
  emailMagicLinkLibrary: ["magicLinkUrl", "firstName"],
  emailPrivacyExport: ["firstName", "downloadUrl", "submissionCount", "expiryDays"],
  emailRecipientIntakeReceived: ["recipientName", "purchaserFirstName", "readingName"],
  emailStepUpOtp: [],
  emailNewDeviceNotice: ["firstName"],
} as const;

const SLOT_PATTERN = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

export function extractSlots(value: string): string[] {
  const found: string[] = [];
  for (const match of value.matchAll(SLOT_PATTERN)) {
    found.push(match[1]);
  }
  return found;
}

export function collectUnknownSlots(value: unknown, allowed: readonly string[]): string[] {
  const unknown = new Set<string>();
  const walk = (input: unknown) => {
    if (typeof input === "string") {
      for (const match of input.matchAll(SLOT_PATTERN)) {
        const slot = match[1];
        if (!allowed.includes(slot)) unknown.add(slot);
      }
    } else if (Array.isArray(input)) {
      for (const entry of input) walk(entry);
    } else if (input && typeof input === "object") {
      for (const child of Object.values(input as Record<string, unknown>)) walk(child);
    }
  };
  walk(value);
  return [...unknown].sort();
}

export function formatSlotError(unknown: string[], allowed: readonly string[]): string {
  const unknownList = unknown.map((slot) => `{${slot}}`).join(", ");
  const allowedList = allowed.length
    ? allowed.map((slot) => `{${slot}}`).join(", ")
    : "(none — this template has no slots)";
  return `Unknown slot(s): ${unknownList}. Allowed: ${allowedList}.`;
}

export type SlotValidationResult =
  | { ok: true }
  | { ok: false; unknown: string[]; allowed: readonly string[] };

export function validateSlotsInValue(
  value: unknown,
  template: EmailTemplateKey,
): SlotValidationResult {
  const allowed = EMAIL_ALLOWED_SLOTS[template];
  const unknown = collectUnknownSlots(value, allowed);
  if (unknown.length === 0) return { ok: true };
  return { ok: false, unknown, allowed };
}

export function formatSlotValidationError(result: Extract<SlotValidationResult, { ok: false }>): string {
  return formatSlotError(result.unknown, result.allowed);
}
