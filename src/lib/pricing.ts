export const PRICE_DISPLAY_RE = /^\$(\d+)(?:\.(\d{2}))?$/;

export function parseDisplayToCents(value: string) {
  const match = value.match(PRICE_DISPLAY_RE);
  if (!match) return null;
  return Number(match[1]) * 100 + Number(match[2] ?? "0");
}
