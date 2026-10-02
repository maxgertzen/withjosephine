export type LegalSlug = "privacy" | "terms" | "refund-policy";

export function isLegalSlug(value: string): value is LegalSlug {
  return value === "privacy" || value === "terms" || value === "refund-policy";
}
