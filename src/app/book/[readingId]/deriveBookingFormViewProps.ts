import { ENTRY_PAGE_DEFAULTS } from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { homeReadingAnchor } from "@/lib/http/routes";
import type { SanityBookingForm, SanityBookingPage, SanityReading } from "@/lib/sanity/types";

import type { BookingFormViewProps } from "./BookingFormView";

const SHARED_TITLE = "A few things, before we begin.";

const SUBTITLE_BY_SLUG: Record<string, string> = {
  "soul-blueprint":
    "Take your time. The more honestly you write, the more your reading can hold.",
  "birth-chart": "For a Birth Chart, I only need the moment you arrived here.",
  "akashic-record":
    "For the records, I’ll need your name, your photo, and three questions.",
};

const FALLBACK_SUBTITLE = "Take your time. There’s no wrong answer.";

export type DeriveBookingFormViewPropsInput = {
  readingId: string;
  sanityReading: SanityReading | null;
  bookingPage: SanityBookingPage | null;
  bookingForm: SanityBookingForm | null;
};

function resolveReading(
  readingId: string,
  sanityReading: SanityReading | null,
): BookingFormViewProps["reading"] | null {
  if (sanityReading) {
    return {
      slug: sanityReading.slug,
      tag: sanityReading.tag,
      name: sanityReading.name,
      priceLabel: sanityReading.priceDisplay,
    };
  }
  const fallback = getReadingById(readingId);
  if (!fallback) return null;
  return {
    slug: readingId,
    tag: fallback.tag,
    name: fallback.name,
    priceLabel: fallback.price,
  };
}

export function deriveBookingFormViewProps(
  input: DeriveBookingFormViewPropsInput,
): BookingFormViewProps | null {
  const reading = resolveReading(input.readingId, input.sanityReading);
  if (!reading) return null;
  if (!input.bookingForm) return null;

  const entry = input.bookingForm.entryPageContent ?? {};

  return {
    backHref: homeReadingAnchor(reading.slug),
    reading,
    copy: {
      title: SHARED_TITLE,
      subtitle: SUBTITLE_BY_SLUG[reading.slug] ?? FALLBACK_SUBTITLE,
      letterOpener: entry.letterOpener ?? ENTRY_PAGE_DEFAULTS.letterOpener,
      letterBridge: entry.letterBridge ?? ENTRY_PAGE_DEFAULTS.letterBridge,
    },
    form: {
      sections: filterSectionsForReading(input.bookingForm.sections, reading.slug),
      nonRefundableNotice: input.bookingForm.nonRefundableNotice,
      pagination: input.bookingForm.pagination,
      loadingStateCopy: input.bookingForm.loadingStateCopy,
      submitLabel: input.bookingPage?.paymentButtonText,
      nextLabel: input.bookingForm.nextButtonText,
      saveLaterLabel: input.bookingForm.saveAndContinueLaterText,
      pageIndicatorTagline: input.bookingForm.pageIndicatorTagline,
    },
  };
}

export { resolveReading };
