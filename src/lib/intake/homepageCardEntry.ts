import { withStorage } from "@/lib/browserStorage";

export const HOMEPAGE_CARD_ENTRY_KEY = "josephine.booking.homepageCardTap";
export const HOMEPAGE_CARD_ENTRY_TTL_MS = 60_000;

type CardTap = { slug: string; tappedAt: number };

export function markHomepageCardEntry(slug: string): void {
  const tap: CardTap = { slug, tappedAt: Date.now() };
  withStorage(
    "sessionStorage",
    (storage) => storage.setItem(HOMEPAGE_CARD_ENTRY_KEY, JSON.stringify(tap)),
    undefined,
  );
}

export function takeHomepageCardEntry(slug: string): boolean {
  return withStorage(
    "sessionStorage",
    (storage) => {
      const raw = storage.getItem(HOMEPAGE_CARD_ENTRY_KEY);
      storage.removeItem(HOMEPAGE_CARD_ENTRY_KEY);
      if (!raw) return false;
      const tap = JSON.parse(raw) as Partial<CardTap>;
      return (
        tap.slug === slug &&
        typeof tap.tappedAt === "number" &&
        Date.now() - tap.tappedAt <= HOMEPAGE_CARD_ENTRY_TTL_MS
      );
    },
    false,
  );
}
