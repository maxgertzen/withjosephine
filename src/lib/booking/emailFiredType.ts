import { CUSTOMER_EMAIL_TYPES, type CustomerEmailType, type EmailFiredType } from "../page-previews/types";

export const LEGACY_EMAIL_FIRED_TYPES: ReadonlyMap<string, EmailFiredType> = new Map([
  ["day7", "reading_delivery"],
  ["day7-overdue-alert", "reading_overdue_alert"],
]);

const GIFT_EMAIL_FIRED_TYPES: ReadonlyMap<string, EmailFiredType> = new Map([
  ["gift_recipient_confirmation", "order_confirmation"],
]);

const EMAIL_FIRED_TYPE_ALIASES: ReadonlyMap<string, EmailFiredType> = new Map([
  ...LEGACY_EMAIL_FIRED_TYPES,
  ...GIFT_EMAIL_FIRED_TYPES,
]);

export function currentEmailFiredType(stored: string): string {
  return EMAIL_FIRED_TYPE_ALIASES.get(stored) ?? stored;
}

export function storedEmailFiredTypes(type: EmailFiredType): string[] {
  const aliases = [...EMAIL_FIRED_TYPE_ALIASES]
    .filter(([, current]) => current === type)
    .map(([stored]) => stored);
  return [type, ...aliases];
}

export function emailFiredTypeNeedle(stored: string): string {
  return `"type":"${stored}"`;
}

export function resendIdNeedle(resendId: string): string {
  return `"resendId":${JSON.stringify(resendId)}`;
}

export function asCustomerEmailType(stored: string | undefined): CustomerEmailType | null {
  const current = stored === undefined ? undefined : currentEmailFiredType(stored);
  return CUSTOMER_EMAIL_TYPES.find((type) => type === current) ?? null;
}

export function isEmailFiredOfType(stored: string | undefined, type: EmailFiredType): boolean {
  return stored !== undefined && storedEmailFiredTypes(type).includes(stored);
}

export function findReadingDeliveryEntry<TEntry extends { type?: string }>(
  emailsFired: readonly TEntry[] | undefined,
): TEntry | undefined {
  return emailsFired?.find((entry) => isEmailFiredOfType(entry.type, "reading_delivery"));
}
