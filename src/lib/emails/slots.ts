export type EmailTemplateKey =
  | "emailOrderConfirmation"
  | "emailDay7Delivery"
  | "emailGiftPurchaseConfirmation"
  | "emailGiftClaim"
  | "emailMagicLink"
  | "emailPrivacyExport"
  | "emailRecipientIntakeReceived";

export const EMAIL_ALLOWED_SLOTS: Record<EmailTemplateKey, readonly string[]> = {
  emailOrderConfirmation: ["firstName", "readingName"],
  emailDay7Delivery: ["firstName", "readingName"],
  emailGiftPurchaseConfirmation: [
    "purchaserFirstName",
    "recipientName",
    "readingName",
    "sendAtDisplay",
  ],
  emailGiftClaim: ["purchaserFirstName", "recipientName", "readingName"],
  emailMagicLink: [],
  emailPrivacyExport: ["submissionCount", "expiryDays"],
  emailRecipientIntakeReceived: ["recipientName", "purchaserFirstName", "readingName"],
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
