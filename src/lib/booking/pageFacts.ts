import { MAX_READING_FACTS, READING_PAGE_DEFAULTS, type ReadingFact } from "@/data/defaults";

type FactsSource = { facts?: ReadingFact[] | null; hideFacts?: boolean | null };

export function sharedFacts(stored: FactsSource | null | undefined): ReadingFact[] {
  if (stored?.hideFacts) return [];
  return (stored?.facts ?? READING_PAGE_DEFAULTS.facts).slice(0, MAX_READING_FACTS);
}

export function pageFacts(reading: FactsSource | null | undefined, shared: FactsSource | null | undefined): ReadingFact[] {
  if (reading?.hideFacts) return [];
  if (reading?.facts?.length) return reading.facts.slice(0, MAX_READING_FACTS);
  return sharedFacts(shared);
}
