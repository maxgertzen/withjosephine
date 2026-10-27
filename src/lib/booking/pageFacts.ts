import { MAX_READING_FACTS, READING_PAGE_DEFAULTS, type ReadingFact } from "@/data/defaults";

type FactsSource = { facts?: ReadingFact[] | null };

export function sharedFacts(stored: FactsSource | null | undefined): ReadingFact[] {
  return (stored?.facts ?? READING_PAGE_DEFAULTS.facts).slice(0, MAX_READING_FACTS);
}

export function pageFacts(reading: FactsSource | null | undefined, shared: FactsSource | null | undefined): ReadingFact[] {
  if (reading?.facts?.length) return reading.facts.slice(0, MAX_READING_FACTS);
  return sharedFacts(shared);
}
