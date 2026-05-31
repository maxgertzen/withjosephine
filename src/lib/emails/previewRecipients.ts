import "server-only";

/**
 * Parses the ALLOWED_PREVIEW_RECIPIENTS Worker env var (comma-separated list
 * of email addresses). Locked design 2026-05-24: the allowlist lives in Worker
 * secrets rather than Sanity siteSettings so a Studio compromise can't widen
 * it; rotating recipients requires a deploy.
 *
 * Returns an empty array when the env var is unset, so callers can shape a
 * 503 "not configured" response without throwing.
 */
export function readAllowedPreviewRecipients(): readonly string[] {
  const raw = process.env.ALLOWED_PREVIEW_RECIPIENTS ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0 && entry.includes("@"));
}

export function isAllowedPreviewRecipient(candidate: string): boolean {
  const list = readAllowedPreviewRecipients();
  if (list.length === 0) return false;
  return list.includes(candidate.trim().toLowerCase());
}
