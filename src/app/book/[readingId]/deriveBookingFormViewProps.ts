import { stegaClean } from "@sanity/client/stega";

import { GIFT_FOLD_COPY_KEYS, type GiftFoldCopy } from "@/components/GiftFold/giftFoldCopy";
import { GIFT_SHEET_CONTENT_KEYS } from "@/components/GiftSheet/giftSheetCopy";
import { FORM_NAVIGATION_LABEL_KEYS } from "@/components/IntakeForm/formNavigationLabels";
import { INTAKE_GIFT_CODE_COPY_KEYS } from "@/components/IntakeForm/intakeGiftCodeCopy";
import type { FormTestimonial } from "@/components/IntakeForm/TestimonialLine";
import type { ReadingBlockProps } from "@/components/ReadingBlock";
import { REDEEM_SHEET_CONTENT_KEYS } from "@/components/RedeemSheet/redeemSheetCopy";
import {
  INTAKE_INTRO_BY_SLUG,
  INTAKE_INTRO_FALLBACK,
  INTAKE_TITLE_FALLBACK,
} from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import {
  type BookingPagePart,
  type BookingPageSection,
  builtInBookingPage,
  chooseBookingPage,
  partRows,
  resolveBookingPage,
  type RowWordField,
} from "@/lib/booking/bookingPageSections";
import { pageFacts } from "@/lib/booking/pageFacts";
import { readingPageContent } from "@/lib/booking/readingPageContent";
import { isReadingOnSite } from "@/lib/booking/readingVisibility";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { nonBlank } from "@/lib/content/nonBlank";
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
  SanityBookingPageSection,
  SanityFormTestimonial,
  SanityGiftSettings,
  SanityLandingPage,
  SanityNotesState,
  SanityReading,
  SanityReadingQuestion,
} from "@/lib/sanity/types";

import type { BookingFormViewProps, BookingFormViewSection } from "./BookingFormView";

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

function formTestimonial(label: string, testimonial: SanityFormTestimonial | undefined): FormTestimonial | undefined {
  return testimonial?.quote
    ? { label, quote: testimonial.quote, name: testimonial.name, detail: testimonial.detail }
    : undefined;
}

function viewSection(
  section: BookingPageSection<SanityReadingQuestion, SanityFormTestimonial>,
  testimonialLabel: string,
): BookingFormViewSection[] {
  if (section.kind === "questions") {
    const items = mapFaqItems(section.questions.filter((item) => item.question && item.answer));
    return items.length > 0 ? [{ ...section, questions: items }] : [];
  }
  if (section.kind === "testimonial") {
    const testimonial = formTestimonial(testimonialLabel, section.testimonial);
    return testimonial ? [{ ...section, testimonial }] : [];
  }
  return [section];
}

type BookingPageRows = {
  rows: SanityBookingPageSection[];
  parts: Partial<Record<BookingPagePart, SanityBookingPageSection>>;
  editTargetOf: (row: SanityBookingPageSection | undefined, field: string) => string | undefined;
};

function bookingPageRows(input: DeriveBookingFormViewPropsInput): BookingPageRows {
  const builtIn = getReadingById(input.readingId);
  const { rows, owner } = input.sanityReading
    ? chooseBookingPage(input.sanityReading.bookingPage, input.bookingForm?.bookingPageStart)
    : { rows: builtInBookingPage({ included: builtIn?.includes, howItWorks: builtIn?.howItWorks }), owner: "builtIn" as const };
  const readingDocument =
    owner === "reading" && input.sanityReading ? { id: input.sanityReading._id, type: "reading" } : undefined;
  return {
    rows,
    parts: partRows(rows),
    editTargetOf: (row, field) =>
      input.editable && readingDocument && row?._key
        ? editTarget(readingDocument, `bookingPage[_key=="${stegaClean(row._key)}"].${field}`)
        : undefined,
  };
}

type RowWord = { text: string; editTarget?: string };

function ownOrShared(own: string | null | undefined, shared: string, editTargetIfShared: string | undefined): RowWord {
  const ownText = nonBlank(own);
  if (ownText) return { text: ownText };
  return editTargetIfShared ? { text: stegaClean(shared), editTarget: editTargetIfShared } : { text: shared };
}

function bookingPageSections(rows: SanityBookingPageSection[], testimonialLabel: string) {
  const page = resolveBookingPage(rows);
  const view = (sections: typeof page.aboveForm): BookingFormViewSection[] =>
    sections.flatMap((section) => viewSection(section, testimonialLabel));
  return {
    aboveForm: view(page.aboveForm),
    belowForm: view(page.belowForm),
    testimonialInsideForm: formTestimonial(testimonialLabel, page.testimonialInsideForm),
  };
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
  const bookingPage = bookingPageRows(input);
  const { parts, editTargetOf } = bookingPage;
  const page = bookingPageSections(bookingPage.rows, content.testimonialLabel);
  const minutes = input.sanityReading?.estimatedMinutes;
  const pageIndicatorTagline = [
    minutes ? applyTokens(content.minutesTemplate, { minutes }) : undefined,
    input.bookingForm.pageIndicatorTagline,
  ]
    .filter(Boolean)
    .join(" · ");

  const { summarySection, factsSection, readerSection, giftRowSection, introSection, otherReadingsSection, notesSection } =
    parts;
  const word = (row: SanityBookingPageSection | undefined, field: RowWordField, shared: string) =>
    ownOrShared(row?.[field], shared, editTargetOf(row, field));
  const eyebrow = word(summarySection, "eyebrow", content.eyebrow);
  const lead = word(summarySection, "promise", reading.valueProposition);
  const description = word(summarySection, "description", reading.description);
  const readerName = word(readerSection, "name", content.readerName);
  const readerLine = word(readerSection, "line", content.readerLine);
  const otherReadingsTitle = word(otherReadingsSection, "title", content.otherReadingsTitle);
  const sharedNotes = readingNotes(input);
  const notesTitle = sharedNotes && word(notesSection, "title", sharedNotes.title);
  const notes = sharedNotes && notesTitle && { ...sharedNotes, title: notesTitle.text };
  const ownFacts = factsSection?.facts?.length ? factsSection : undefined;
  const factsEditTarget = ownFacts ? undefined : editTargetOf(factsSection, "facts");
  const facts = pageFacts(ownFacts, content).map((fact) =>
    factsEditTarget ? { label: stegaClean(fact.label), value: stegaClean(fact.value) } : fact,
  );
  const hidePhoto = readerSection?.hidePhoto ?? content.hideReaderPhoto;
  const photoUrl = nonBlank(readerSection?.photoUrl) ?? mapAbout(input.landingPage).imageUrl;
  const aboutPhotoEditTarget =
    input.editable && input.landingPage?._id
      ? editTarget({ id: input.landingPage._id, type: "landingPage" }, "about.image")
      : undefined;

  const readingBlock: ReadingBlockProps = {
    slug: reading.slug,
    eyebrow: eyebrow.text,
    lead: lead.text,
    description: description.text,
    facts,
    factsLayout: content,
    reader: {
      name: readerName.text,
      line: readerLine.text,
      imageUrl: hidePhoto ? undefined : sanityImageUrl(photoUrl, { w: PORTRAIT_WIDTH_PX }),
      imageEditTarget: editTargetOf(readerSection, "photo") ?? aboutPhotoEditTarget,
    },
    otherReadings: {
      title: otherReadingsTitle.text,
      readings: mapReadings(input.sanityReadings)
        .filter((other) => other.id !== reading.slug)
        .map((other) => ({
          name: other.name,
          price: other.price,
          line: other.valueProposition,
          slug: other.id,
        })),
    },
    notes,
    editTargets: {
      eyebrow: eyebrow.editTarget,
      lead: lead.editTarget,
      description: description.editTarget,
      facts: factsEditTarget,
      readerName: readerName.editTarget,
      readerLine: readerLine.editTarget,
      otherReadingsTitle: otherReadingsTitle.editTarget,
      notesTitle: notesTitle?.editTarget,
    },
  };

  const gift = giftContent(input.giftSettings);
  const giftFoldWords = GIFT_FOLD_COPY_KEYS.map((key) => [key, word(giftRowSection, key, gift[key])] as const);
  const formHeading =
    nonBlank(introSection?.title) || entry.showLetterTitle
      ? word(introSection, "title", entry.letterTitle ?? INTAKE_TITLE_FALLBACK)
      : undefined;
  const ownOpeningWords = introSection?.openingWords?.length ? introSection.openingWords : undefined;
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
    sections: { aboveForm: page.aboveForm, belowForm: page.belowForm },
    copy: {
      title: formHeading?.text,
      titleEditTarget: formHeading?.editTarget,
      intro: ownOpeningWords ?? paragraphBlocks(INTAKE_INTRO_BY_SLUG[reading.slug] ?? INTAKE_INTRO_FALLBACK),
      introEditTarget: ownOpeningWords ? undefined : editTargetOf(introSection, "openingWords"),
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
      testimonial: page.testimonialInsideForm,
      giftCodeField: { copy: pick(gift, INTAKE_GIFT_CODE_COPY_KEYS) },
    },
    giftFold: {
      readingSlug: reading.slug,
      copy: Object.fromEntries(giftFoldWords.map(([key, { text }]) => [key, text])) as GiftFoldCopy,
      editTargets: Object.fromEntries(giftFoldWords.map(([key, { editTarget: target }]) => [key, target])),
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
