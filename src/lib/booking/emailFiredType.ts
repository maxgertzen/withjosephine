import type { EmailFiredType } from "../page-previews/types";

export const LEGACY_EMAIL_FIRED_TYPES: ReadonlyMap<string, EmailFiredType> = new Map([
  ["day7", "reading_delivery"],
  ["day7-overdue-alert", "reading_overdue_alert"],
]);

export function currentEmailFiredType(stored: string): string {
  return LEGACY_EMAIL_FIRED_TYPES.get(stored) ?? stored;
}

export function storedEmailFiredTypes(type: EmailFiredType): string[] {
  const legacy = [...LEGACY_EMAIL_FIRED_TYPES]
    .filter(([, current]) => current === type)
    .map(([stored]) => stored);
  return [type, ...legacy];
}

export function emailFiredTypeNeedle(stored: string): string {
  return `"type":"${stored}"`;
}

export function isEmailFiredOfType(stored: string | undefined, type: EmailFiredType): boolean {
  return stored !== undefined && currentEmailFiredType(stored) === type;
}

export function findReadingDeliveryEntry<TEntry extends { type?: string }>(
  emailsFired: readonly TEntry[] | undefined,
): TEntry | undefined {
  return emailsFired?.find((entry) => isEmailFiredOfType(entry.type, "reading_delivery"));
}
