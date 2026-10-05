import { READINGS } from "@/data/readings";

import { fetchReadingSlugs } from "./fetch";

export async function generateReadingStaticParams(): Promise<{ readingId: string }[]> {
  const sanitySlugs = await fetchReadingSlugs();
  if (sanitySlugs.length > 0) {
    return sanitySlugs.map((s) => ({ readingId: s.slug }));
  }
  return READINGS.map((reading) => ({ readingId: reading.id }));
}
