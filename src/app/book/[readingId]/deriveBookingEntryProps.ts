import { BOOKING_INFO_DEFAULTS, ENTRY_PAGE_DEFAULTS } from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import type {
  SanityBookingForm,
  SanityBookingPage,
  SanityReading,
} from "@/lib/sanity/types";

import type {
  BookingEntryReading,
  BookingEntryViewProps,
} from "./BookingEntryView";

export function resolveReading(
  readingId: string,
  sanityReading: SanityReading | null,
): BookingEntryReading | null {
  if (sanityReading) {
    return {
      slug: sanityReading.slug,
      tag: sanityReading.tag,
      name: sanityReading.name,
      priceLabel: sanityReading.priceDisplay,
      shortDescription: sanityReading.bookingSummary,
      includedItems: sanityReading.includes,
    };
  }
  const fallback = getReadingById(readingId);
  if (!fallback) return null;
  return {
    slug: readingId,
    tag: fallback.tag,
    name: fallback.name,
    priceLabel: fallback.price,
    shortDescription: fallback.bookingSummary,
    includedItems: fallback.includes,
  };
}

export type DeriveBookingEntryPropsInput = {
  readingId: string;
  sanityReading: SanityReading | null;
  bookingPage: SanityBookingPage | null;
  bookingForm: SanityBookingForm | null;
};

export function deriveBookingEntryProps(
  input: DeriveBookingEntryPropsInput,
): BookingEntryViewProps | null {
  const reading = resolveReading(input.readingId, input.sanityReading);
  if (!reading) return null;

  const entry = input.bookingForm?.entryPageContent ?? {};

  return {
    reading,
    copy: {
      changeReadingLinkText:
        entry.changeReadingLinkText ?? ENTRY_PAGE_DEFAULTS.changeReadingLinkText,
      deliveryNote: input.bookingPage?.deliveryNote ?? BOOKING_INFO_DEFAULTS.deliveryNote,
      deliverableNote:
        input.bookingPage?.formatNote ?? BOOKING_INFO_DEFAULTS.deliverableNote,
      whatsIncludedHeading:
        input.bookingPage?.whatsIncludedHeading ??
        BOOKING_INFO_DEFAULTS.whatsIncludedHeading,
      bookReadingCtaText:
        input.bookingPage?.bookReadingCtaText ?? BOOKING_INFO_DEFAULTS.bookReadingCtaText,
    },
  };
}
