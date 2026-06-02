import { ENTRY_PAGE_DEFAULTS } from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import type { SanityBookingForm, SanityReading } from "@/lib/sanity/types";

import type { LetterReading, LetterViewProps } from "./LetterView";

function resolveLetterReading(
  readingId: string,
  sanityReading: SanityReading | null,
): LetterReading | null {
  if (sanityReading) return { slug: sanityReading.slug };
  if (getReadingById(readingId)) return { slug: readingId };
  return null;
}

export type DeriveLetterViewPropsInput = {
  readingId: string;
  sanityReading: SanityReading | null;
  bookingForm: SanityBookingForm | null;
};

export function deriveLetterViewProps(
  input: DeriveLetterViewPropsInput,
): LetterViewProps | null {
  const reading = resolveLetterReading(input.readingId, input.sanityReading);
  if (!reading) return null;

  const entry = input.bookingForm?.entryPageContent ?? {};

  return {
    reading,
    aboutJosephineLinkText:
      entry.aboutJosephineLinkText ?? ENTRY_PAGE_DEFAULTS.aboutJosephineLinkText,
    letterContent: {
      letterOpener: entry.letterOpener ?? ENTRY_PAGE_DEFAULTS.letterOpener,
      letterBridge: entry.letterBridge ?? ENTRY_PAGE_DEFAULTS.letterBridge,
      letterClosing: entry.letterClosing ?? ENTRY_PAGE_DEFAULTS.letterClosing,
      dropCapCta: entry.dropCapCta ?? ENTRY_PAGE_DEFAULTS.dropCapCta,
      dropCapCaption: entry.dropCapCaption ?? ENTRY_PAGE_DEFAULTS.dropCapCaption,
    },
  };
}

export { resolveLetterReading };
