import type { EmailFiredType } from "../page-previews/types";

const DAY7_EMAIL: EmailFiredType = "day7";

export function findDay7Entry<TEntry extends { type?: string }>(
  emailsFired: readonly TEntry[] | undefined,
): TEntry | undefined {
  return emailsFired?.find((entry) => entry.type === DAY7_EMAIL);
}
