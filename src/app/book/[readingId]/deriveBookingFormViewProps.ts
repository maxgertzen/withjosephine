import type { ReadingBlockProps } from "@/components/ReadingBlock";
import {
  INTAKE_INTRO_BY_SLUG,
  INTAKE_INTRO_FALLBACK,
  INTAKE_TITLE_FALLBACK,
  READING_PAGE_DEFAULTS,
} from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import { applyTokens } from "@/lib/emails/applyTokens";
import { homeReadingAnchor } from "@/lib/http/routes";
import { mapAbout, mapFaqItems, mapReadings } from "@/lib/sanity/mappers";
import { pickDefined } from "@/lib/sanity/pickDefined";
import type {
  SanityBookingForm,
  SanityBookingPage,
  SanityLandingPage,
  SanityReading,
} from "@/lib/sanity/types";

import type { BookingFormViewProps } from "./BookingFormView";

export type DeriveBookingFormViewPropsInput = {
  readingId: string;
  sanityReading: SanityReading | null;
  sanityReadings: SanityReading[];
  bookingPage: SanityBookingPage | null;
  bookingForm: SanityBookingForm | null;
  landingPage: SanityLandingPage | null;
};

const PORTRAIT_WIDTH_PX = 112;

function portraitUrl(imageUrl: string): string {
  return imageUrl.startsWith("https://cdn.sanity.io/")
    ? `${imageUrl}?w=${PORTRAIT_WIDTH_PX}&auto=format`
    : imageUrl;
}

function resolveReading(readingId: string, sanityReading: SanityReading | null) {
  if (sanityReading) {
    return {
      slug: sanityReading.slug,
      tag: sanityReading.tag,
      name: sanityReading.name,
      subtitle: sanityReading.subtitle,
      priceLabel: sanityReading.priceDisplay,
      valueProposition: sanityReading.valueProposition,
      expandedDetails: sanityReading.expandedDetails ?? [],
      includes: sanityReading.includes ?? [],
    };
  }
  const fallback = getReadingById(readingId);
  if (!fallback) return null;
  return {
    slug: readingId,
    tag: fallback.tag,
    name: fallback.name,
    subtitle: fallback.subtitle,
    priceLabel: fallback.price,
    valueProposition: fallback.valueProposition,
    expandedDetails: fallback.expandedDetails,
    includes: fallback.includes,
  };
}

export function deriveBookingFormViewProps(
  input: DeriveBookingFormViewPropsInput,
): BookingFormViewProps | null {
  const reading = resolveReading(input.readingId, input.sanityReading);
  if (!reading) return null;
  if (!input.bookingForm) return null;

  const entry = input.bookingForm.entryPageContent ?? {};
  const content = { ...READING_PAGE_DEFAULTS, ...pickDefined(input.bookingForm.readingPageContent ?? {}) };
  const [body, ...howItWorks] = reading.expandedDetails;
  const minutes = input.sanityReading?.estimatedMinutes;
  const formTestimonial = input.sanityReading?.formTestimonial;
  const pageIndicatorTagline = [
    minutes ? applyTokens(content.minutesTemplate, { minutes }) : undefined,
    input.bookingForm.pageIndicatorTagline,
  ]
    .filter(Boolean)
    .join(" · ");

  const readingBlock: ReadingBlockProps = {
    slug: reading.slug,
    foldRowLabel: applyTokens(content.foldRowLabel, { reading: reading.subtitle || reading.name }),
    eyebrow: content.eyebrow,
    lead: reading.valueProposition,
    body,
    facts: content.facts,
    reader: {
      name: content.readerName,
      line: content.readerLine,
      imageUrl: portraitUrl(mapAbout(input.landingPage).imageUrl),
    },
    included: { title: content.includedTitle, items: reading.includes },
    howItWorks: { title: content.howItWorksTitle, paragraphs: howItWorks },
    questions: {
      title: content.questionsTitle,
      items: mapFaqItems(
        (input.sanityReading?.questionsOnPage ?? []).filter((item) => item?.question && item.answer),
      ),
    },
    otherReadings: {
      title: content.otherReadingsTitle,
      readings: mapReadings(input.sanityReadings)
        .filter((other) => other.id !== reading.slug)
        .map((other) => ({
          name: other.name,
          price: other.price,
          line: other.valueProposition,
          slug: other.id,
        })),
    },
  };

  return {
    backHref: homeReadingAnchor(reading.slug),
    reading: {
      slug: reading.slug,
      tag: reading.tag,
      name: reading.name,
      priceLabel: reading.priceLabel,
    },
    readingBlock,
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
      pageIndicatorTagline: pageIndicatorTagline || undefined,
      testimonial: formTestimonial?.quote
        ? {
            label: content.testimonialLabel,
            quote: formTestimonial.quote,
            name: formTestimonial.name,
            detail: formTestimonial.detail,
          }
        : undefined,
    },
  };
}
