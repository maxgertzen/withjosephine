import {
  INTAKE_INTRO_BY_SLUG,
  INTAKE_INTRO_FALLBACK,
  INTAKE_TITLE_FALLBACK,
} from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import { homeReadingAnchor } from "@/lib/http/routes";
import type { SanityBookingForm, SanityBookingPage, SanityReading } from "@/lib/sanity/types";

import type { BookingFormViewProps } from "./BookingFormView";

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
      title: entry.letterTitle ?? INTAKE_TITLE_FALLBACK,
      intro: input.sanityReading?.intakeIntro?.length
        ? input.sanityReading.intakeIntro
        : paragraphBlocks(INTAKE_INTRO_BY_SLUG[reading.slug] ?? INTAKE_INTRO_FALLBACK),
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
