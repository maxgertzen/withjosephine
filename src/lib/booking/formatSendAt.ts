/**
 * Format an ISO timestamp as a human-readable date + time string suitable for
 * the scheduled-variant gift purchase confirmation email body + subject. Falls
 * back to the raw ISO if the value isn't parseable so the email still sends
 * something rather than throwing.
 *
 * Locked to UTC for cross-recipient predictability — the purchaser's timezone
 * is unknown server-side, and rendering as UTC keeps the email body
 * deterministic across worker regions.
 */
export function formatSendAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  });
}
