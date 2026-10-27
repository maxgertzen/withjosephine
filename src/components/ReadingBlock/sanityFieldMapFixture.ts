import { deriveBookingFormViewProps } from "@/app/book/[readingId]/deriveBookingFormViewProps";
import { toHomePageViewProps } from "@/app/homePageViewProps";
import { type ReadingCardProps, readingCardProps } from "@/components/ReadingCard";
import type { SanityBookingForm, SanityLandingPage, SanityReading } from "@/lib/sanity/types";

import type { ReadingBlockPreviewProps } from "./ReadingBlockPreview";

const fieldLabel = (place: string, studioTitle: string, field: string) =>
  `[${place} › ${studioTitle} · ${field}]`;

const readingField = (studioTitle: string, field: string) => fieldLabel("Reading", studioTitle, field);

const readingPageField = (studioTitle: string, field: string) =>
  fieldLabel("Booking Form › Reading Page", studioTitle, `readingPageContent.${field}`);

const bookingPageField = (studioTitle: string, field: string) => fieldLabel("Reading › Booking page", studioTitle, `bookingPage${field}`);

const listBox = (key: string, lines: number) => ({
  _key: key,
  _type: "listSection",
  title: bookingPageField("Box heading", `[${key}].title`),
  items: Array.from({ length: lines }, (_, index) => bookingPageField("Box line", `[${key}].items[${index}]`)),
});

const readingsSectionField = (studioTitle: string, field: string) =>
  fieldLabel("Landing Page › Readings Section", studioTitle, `readingsSection.${field}`);

function fieldMapReading(slug: string): SanityReading {
  return {
    _id: `reading-${slug}`,
    slug,
    name: readingField("Name", "name"),
    tag: readingField("Tag", "tag"),
    subtitle: readingField("Subtitle", "subtitle"),
    price: 0,
    priceDisplay: readingField("Display Price", "priceDisplay"),
    valueProposition: readingField("Promise on the homepage card", "valueProposition"),
    briefDescription: readingField("Description on the homepage card", "briefDescription"),
    includes: [0, 1, 2].map((index) => readingField("Lines under 'Learn More' on the homepage card", `includes[${index}]`)),
    bookingPage: [
      {
        _key: "summary",
        _type: "summarySection",
        promise: bookingPageField("Promise", "[summary].promise"),
        description: bookingPageField("Description", "[summary].description"),
      },
      { _key: "facts", _type: "factsSection" },
      { _key: "reader", _type: "readerSection" },
      listBox("included", 3),
      listBox("how", 2),
      { _key: "other", _type: "otherReadingsSection" },
    ],
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
  };
}

export const FIELD_MAP_READINGS = ["soul-blueprint", "birth-chart"].map(fieldMapReading);

const FIELD_MAP_BOOKING_FORM: SanityBookingForm = {
  nonRefundableNotice: "",
  sections: [],
  readingPageContent: {
    eyebrow: readingPageField("Small Label Above the Promise", "eyebrow"),
    facts: [0, 1, 2].map((index) => ({
      label: readingPageField("Facts Row label", `facts[${index}].label`),
      value: readingPageField("Facts Row value", `facts[${index}].value`),
    })),
    readerName: readingPageField("Reader Name", "readerName"),
    readerLine: readingPageField("Line Under the Reader Name", "readerLine"),
    otherReadingsTitle: readingPageField("Other Readings Title", "otherReadingsTitle"),
  },
};

const FIELD_MAP_LANDING_PAGE = {
  readingsSection: {
    learnMoreLabel: readingsSectionField("Learn More button", "learnMoreLabel"),
    showLessLabel: readingsSectionField("Show Less button", "showLessLabel"),
    bookButtonText: readingsSectionField("Book button", "bookButtonText"),
  },
} as SanityLandingPage;

export function fieldMapCardProps(): ReadingCardProps {
  const home = toHomePageViewProps({
    landingPage: FIELD_MAP_LANDING_PAGE,
    readings: FIELD_MAP_READINGS,
    testimonials: [],
    faqItems: [],
    siteSettings: null,
    notesState: null,
  });
  return readingCardProps(home.readings[0], home.readingsSection);
}

export function fieldMapBlockProps(): ReadingBlockPreviewProps {
  const [reading] = FIELD_MAP_READINGS;
  const props = deriveBookingFormViewProps({
    readingId: reading.slug,
    sanityReading: reading,
    sanityReadings: FIELD_MAP_READINGS,
    bookingPage: null,
    bookingForm: FIELD_MAP_BOOKING_FORM,
    landingPage: null,
    notesState: null,
    readingNotes: [],
    giftSettings: null,
    nav: {},
  });
  if (!props) throw new Error("field map fixture did not produce booking page props");
  return { block: props.readingBlock, sections: [...props.sections.aboveForm, ...props.sections.belowForm] };
}
