const longDateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export function parseIso(value: unknown): Date | null {
  if (typeof value !== "string" || value === "") return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function formatDate(date: Date): string {
  return longDateFormatter.format(date);
}

export function formatLongDate(value: unknown): string | null {
  const date = parseIso(value);
  return date ? formatDate(date) : null;
}

export function trimmedStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
