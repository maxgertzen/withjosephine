import "server-only";

/**
 * Parses a comma-separated env var value into a validated, normalised list of
 * email addresses. Trims whitespace, lowercases, and drops entries with no
 * "@". Returns an empty array when the raw value is absent or blank.
 */
export function parseEmailList(rawEnvValue: string | undefined): readonly string[] {
  const raw = rawEnvValue ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0 && entry.includes("@"));
}

/**
 * Reads and parses ALLOWED_PREVIEW_RECIPIENTS. Locked design 2026-05-24: the
 * allowlist lives in Worker secrets rather than Sanity siteSettings so a
 * Studio compromise can't widen it; rotating recipients requires a deploy.
 *
 * Returns an empty array when the env var is unset, so callers can shape a
 * 503 "not configured" response without throwing.
 */
export function readAllowedPreviewRecipients(): readonly string[] {
  return parseEmailList(process.env.ALLOWED_PREVIEW_RECIPIENTS);
}

export function isAllowedPreviewRecipient(candidate: string): boolean {
  const list = readAllowedPreviewRecipients();
  if (list.length === 0) return false;
  return list.includes(candidate.trim().toLowerCase());
}
