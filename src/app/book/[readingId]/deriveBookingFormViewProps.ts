import { GIFT_FOLD_COPY_KEYS } from "@/components/GiftFold/giftFoldCopy";
import { GIFT_SHEET_CONTENT_KEYS } from "@/components/GiftSheet/giftSheetCopy";
import { FORM_NAVIGATION_LABEL_KEYS } from "@/components/IntakeForm/formNavigationLabels";
import { INTAKE_GIFT_CODE_COPY_KEYS } from "@/components/IntakeForm/intakeGiftCodeCopy";
import type { ReadingBlockProps } from "@/components/ReadingBlock";
import { REDEEM_SHEET_CONTENT_KEYS } from "@/components/RedeemSheet/redeemSheetCopy";
import {
  INTAKE_INTRO_BY_SLUG,
  INTAKE_INTRO_FALLBACK,
  INTAKE_TITLE_FALLBACK,
} from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import { pageFacts } from "@/lib/booking/pageFacts";
import { chooseLayoutEntries, resolveBookingPageLayout } from "@/lib/booking/pageLayout";
import { readingPageContent } from "@/lib/booking/readingPageContent";
import { isReadingOnSite } from "@/lib/booking/readingVisibility";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { linesWithText } from "@/lib/content/nonBlank";
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
import { editTarget } from "@/lib/sanity/editTarget";
import { sanityImageUrl } from "@/lib/sanity/imageUrl";
import { mapAbout, mapFaqItems, mapReadings } from "@/lib/sanity/mappers";
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
  nav: BookingFormViewProps["nav"];
  footer?: BookingFormViewProps["footer"];
  editable?: boolean;
};

function readingNotes(input: DeriveBookingFormViewPropsInput): ReadingBlockProps["notes"] {
  if (!isNotesVisible(input.notesState) || input.readingNotes.length === 0) return undefined;
  return {
    title: notesContent(input.notesState).readingPageTitle,
    items: input.readingNotes.map((note) => ({ ...note, href: notePath(note.slug) })),
  };
}

const PORTRAIT_WIDTH_PX = 300;

function ownOrHomepageLines(own: string[] | null | undefined, homepage: string[]) {
  const ownLines = linesWithText(own);
  return ownLines.length > 0 ? ownLines : linesWithText(homepage);
}

function resolveReading(
  readingId: string,
  sanityReading: SanityReading | null,
  sanityHasReadings: boolean,
) {
  if (sanityReading) {
    return {
      slug: sanityReading.slug,
      tag: sanityReading.tag,
      name: sanityReading.name,
      subtitle: sanityReading.subtitle,
      priceLabel: sanityReading.priceDisplay,
      valueProposition: sanityReading.valueProposition,
      description: sanityReading.briefDescription,
      includes: ownOrHomepageLines(sanityReading.bookingIncludes, sanityReading.includes),
      howItWorks: linesWithText(sanityReading.howItWorks),
    };
  }
  const fallback = sanityHasReadings ? undefined : getReadingById(readingId);
  if (!fallback) return null;
  return {
    slug: readingId,
    tag: fallback.tag,
    name: fallback.name,
    subtitle: fallback.subtitle,
    priceLabel: fallback.price,
    valueProposition: fallback.valueProposition,
    description: fallback.briefDescription,
    includes: fallback.includes,
    howItWorks: fallback.howItWorks,
  };
}

export function deriveBookingFormViewProps(
  input: DeriveBookingFormViewPropsInput,
): BookingFormViewProps | null {
  const reading = resolveReading(
    input.readingId,
    input.sanityReading,
    input.sanityReadings.length > 0,
  );
  if (!reading) return null;
  if (!input.bookingForm) return null;

  const entry = input.bookingForm.entryPageContent ?? {};
  const content = readingPageContent(input.bookingForm);
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
    eyebrow: content.eyebrow,
    lead: reading.valueProposition,
    description: reading.description,
    facts: pageFacts(input.sanityReading, content),
    factsLayout: content,
    reader: {
      name: content.readerName,
      line: content.readerLine,
      imageUrl: content.hideReaderPhoto
        ? undefined
        : sanityImageUrl(mapAbout(input.landingPage).imageUrl, { w: PORTRAIT_WIDTH_PX }),
      imageEditTarget:
        input.editable && input.landingPage?._id
          ? editTarget({ id: input.landingPage._id, type: "landingPage" }, "about.image")
          : undefined,
    },
    included: { title: content.includedTitle, items: reading.includes },
    howItWorks: { title: content.howItWorksTitle, items: reading.howItWorks },
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
    nav: input.nav,
    footer: input.footer,
    backHref: isReadingOnSite(input.sanityReading) ? homeReadingAnchor(reading.slug) : "/",
    backLabel: content.backLabel,
    reading: {
      slug: reading.slug,
      tag: reading.tag,
      name: reading.name,
      priceLabel: reading.priceLabel,
    },
    readingBlock,
    layout: resolveBookingPageLayout(
      chooseLayoutEntries(input.sanityReading?.pageLayout, input.bookingForm.pageLayout),
      {
        hiddenEverywhere: input.bookingForm.hiddenParts,
        hiddenOnReading: input.sanityReading?.hiddenParts,
        testimonialInsideForm: input.bookingForm.testimonialInsideForm,
      },
    ),
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
      navigationLabels: pick(content, FORM_NAVIGATION_LABEL_KEYS),
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
      giftCodeField: { copy: pick(gift, INTAKE_GIFT_CODE_COPY_KEYS) },
    },
    giftFold: {
      readingSlug: reading.slug,
      copy: pick(gift, GIFT_FOLD_COPY_KEYS),
      giftSheet: {
        reading: { slug: reading.slug, name: reading.name, price: reading.priceLabel },
        content: pick(gift, GIFT_SHEET_CONTENT_KEYS),
        paymentButtonText: submitLabel,
        loadingStateCopy,
        endpoint: GIFT_PURCHASE_API_ROUTE,
      },
      redeemSheet: {
        readingSlug: reading.slug,
        content: pick(gift, REDEEM_SHEET_CONTENT_KEYS),
        endpoint: GIFT_CHECK_API_ROUTE,
      },
    },
  };
}
