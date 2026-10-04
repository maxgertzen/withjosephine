import { getReadingById } from "@/data/readings";
import type { SanityReading } from "@/lib/sanity/types";

export type ReadingSummary = {
  slug: string;
  tag: string;
  name: string;
  priceLabel: string;
  priceCents: number | null;
};

export type SanityReadingFetcher = (slug: string) => Promise<SanityReading | null>;

export async function resolveReadingSummary(
  slug: string,
  fetchReading: SanityReadingFetcher,
): Promise<ReadingSummary | null> {
  const sanityReading = await fetchReading(slug);
  if (sanityReading) {
    return {
      slug,
      tag: sanityReading.tag,
      name: sanityReading.name,
      priceLabel: sanityReading.priceDisplay,
      priceCents: sanityReading.price,
    };
  }
  const fallback = getReadingById(slug);
  return fallback
    ? { slug, tag: fallback.tag, name: fallback.name, priceLabel: fallback.price, priceCents: null }
    : null;
}

export async function readingExists(slug: string, fetchReading: SanityReadingFetcher): Promise<boolean> {
  return getReadingById(slug) !== undefined || (await fetchReading(slug)) !== null;
}
