import { READINGS } from "@/data/readings";
import { isReadingOnSite } from "@/lib/booking/readingVisibility";

import { fetchReadingSlugs } from "./fetch";

export async function generateReadingStaticParams(): Promise<{ readingId: string }[]> {
  const sanitySlugs = await fetchReadingSlugs();
  if (sanitySlugs.length > 0) {
    return sanitySlugs.filter(isReadingOnSite).map((s) => ({ readingId: s.slug }));
  }
  return READINGS.map((reading) => ({ readingId: reading.id }));
}
