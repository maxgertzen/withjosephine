/**
 * Reading access retention policy (locked 2026-05-24).
 *
 * A delivered reading stays self-service-reachable for 90 days after
 * `delivered_at`. After that window the listen page and /my-readings show an
 * expired affordance pointing the customer at `hello@withjosephine.com`, where
 * Josephine can mint a fresh magic link via `/api/internal/issue-magic-link`
 * (the admin escape hatch is NOT subject to this gate).
 *
 * R2 lifecycle (Cloudflare dashboard, applied separately) deletes the voice
 * note + PDF object ~120 days post-upload — 90 days of customer access plus a
 * 30-day grace for late re-issues.
 */
export const READING_ACCESS_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function isReadingExpired(
  deliveredAt: number | null | undefined,
  now: number = Date.now(),
): boolean {
  if (deliveredAt == null) return false;
  return now > deliveredAt + READING_ACCESS_TTL_MS;
}
