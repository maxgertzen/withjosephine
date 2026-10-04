import { GIFT_FOLD_COPY_KEYS } from "@/components/GiftFold/giftFoldCopy";
import type { ReadingBlockProps } from "@/components/ReadingBlock";
import {
  INTAKE_INTRO_BY_SLUG,
  INTAKE_INTRO_FALLBACK,
  INTAKE_TITLE_FALLBACK,
  MAX_READING_FACTS,
  READING_PAGE_DEFAULTS,
  type ReadingFact,
  type ReadingPageContent,
} from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import { applyTokens } from "@/lib/emails/applyTokens";
import { giftContent } from "@/lib/gift/giftContent";
import {
  GIFT_CHECK_API_ROUTE,
  GIFT_PURCHASE_API_ROUTE,
  homeReadingAnchor,
} from "@/lib/http/routes";
import { isNotesVisible, notePath, notesContent } from "@/lib/notes/notes";
import type { NoteSummary } from "@/lib/notes/types";
import { pick } from "@/lib/pick";
import { sanityImageUrl } from "@/lib/sanity/imageUrl";
import { mapAbout, mapFaqItems, mapReadings } from "@/lib/sanity/mappers";
import { pickDefined } from "@/lib/sanity/pickDefined";
import type {
  SanityBookingForm,
  SanityBookingPage,
  SanityGiftSettings,
  SanityLandingPage,
  SanityNotesState,
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
  notesState: SanityNotesState | null;
  readingNotes: NoteSummary[];
  giftSettings: SanityGiftSettings | null;
};

function readingNotes(input: DeriveBookingFormViewPropsInput): ReadingBlockProps["notes"] {
  if (!isNotesVisible(input.notesState) || input.readingNotes.length === 0) return undefined;
  return {
    title: notesContent(input.notesState).readingPageTitle,
    items: input.readingNotes.map((note) => ({ ...note, href: notePath(note.slug) })),
  };
}

const PORTRAIT_WIDTH_PX = 112;

function pageFacts(
  reading: SanityReading | null | undefined,
  shared: ReadingPageContent,
): ReadingFact[] {
  if (reading?.hideFacts) return [];
  if (reading?.facts?.length) return reading.facts.slice(0, MAX_READING_FACTS);
  if (shared.hideFacts) return [];
  return shared.facts.slice(0, MAX_READING_FACTS);
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
  const content = {
    ...READING_PAGE_DEFAULTS,
    ...pickDefined(input.bookingForm.readingPageContent ?? {}),
  };
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
    facts: pageFacts(input.sanityReading, content),
    factsLayout: content,
    reader: {
      name: content.readerName,
      line: content.readerLine,
      imageUrl: content.hideReaderPhoto
        ? undefined
        : sanityImageUrl(mapAbout(input.landingPage).imageUrl, { w: PORTRAIT_WIDTH_PX }),
    },
    included: { title: content.includedTitle, items: reading.includes },
    howItWorks: { title: content.howItWorksTitle, paragraphs: howItWorks },
    questions: {
      title: content.questionsTitle,
      items: mapFaqItems(
        (input.sanityReading?.questionsOnPage ?? []).filter(
          (item) => item?.question && item.answer,
        ),
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
    notes: readingNotes(input),
  };

  const gift = giftContent(input.giftSettings);
  const submitLabel = input.bookingPage?.paymentButtonText;
  const loadingStateCopy = input.bookingForm.loadingStateCopy;

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
      title: entry.showLetterTitle ? (entry.letterTitle ?? INTAKE_TITLE_FALLBACK) : undefined,
      intro: input.sanityReading?.intakeIntro?.length
        ? input.sanityReading.intakeIntro
        : paragraphBlocks(INTAKE_INTRO_BY_SLUG[reading.slug] ?? INTAKE_INTRO_FALLBACK),
    },
    form: {
      sections: filterSectionsForReading(input.bookingForm.sections, reading.slug),
      nonRefundableNotice: input.bookingForm.nonRefundableNotice,
      pagination: input.bookingForm.pagination,
      loadingStateCopy,
      submitLabel,
      nextLabel: input.bookingForm.nextButtonText,
      saveLaterLabel: input.bookingForm.saveAndContinueLaterText,
      pageIndicatorTagline: pageIndicatorTagline || undefined,
      switchNotice: applyTokens(content.switchNoticeTemplate, { reading: reading.name }),
      testimonial: formTestimonial?.quote
        ? {
            label: content.testimonialLabel,
            quote: formTestimonial.quote,
            name: formTestimonial.name,
            detail: formTestimonial.detail,
          }
        : undefined,
      giftCodeField: { copy: gift },
    },
    giftFold: {
      readingSlug: reading.slug,
      copy: pick(gift, GIFT_FOLD_COPY_KEYS),
      giftSheet: {
        reading: { slug: reading.slug, name: reading.name, price: reading.priceLabel },
        content: gift,
        paymentButtonText: submitLabel,
        loadingStateCopy,
        endpoint: GIFT_PURCHASE_API_ROUTE,
      },
      redeemSheet: { readingSlug: reading.slug, content: gift, endpoint: GIFT_CHECK_API_ROUTE },
    },
  };
}
