export const HOMEPAGE_CARD_ENTRY_TTL_MS = 60_000;

let pendingTap: { slug: string; tappedAt: number } | null = null;

export function markHomepageCardEntry(slug: string): void {
  pendingTap = { slug, tappedAt: Date.now() };
}

export function takeHomepageCardEntry(slug: string): boolean {
  const tap = pendingTap;
  pendingTap = null;
  return (
    tap !== null && tap.slug === slug && Date.now() - tap.tappedAt <= HOMEPAGE_CARD_ENTRY_TTL_MS
  );
}
