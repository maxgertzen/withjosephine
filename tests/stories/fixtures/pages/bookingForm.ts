import { deriveBookingFormViewProps } from "@/app/book/[readingId]/deriveBookingFormViewProps";
import { SOUL_BLUEPRINT_QUESTIONS } from "@/components/ReadingBlock/readingBlockFixture";
import { builtInBookingPage } from "@/lib/booking/bookingPageSections";
import type { SanityBookingForm, SanityReading } from "@/lib/sanity/types";

import bookingFormFixture from "../../../../src/__fixtures__/sanity/e2e/bookingForm.json";
import readingsFixture from "../../../../src/__fixtures__/sanity/e2e/readings.json";

const readings = readingsFixture as unknown as SanityReading[];
const bookingForm = bookingFormFixture as unknown as SanityBookingForm;

const SOUL_BLUEPRINT_EXTRAS: Partial<SanityReading> = {
  estimatedMinutes: 4,
  bookingPage: builtInBookingPage({
    included: readings.find((reading) => reading.slug === "soul-blueprint")?.includes,
  }).map((section, index) => {
    const keyed = { ...section, _key: `section-${index}` };
    if (section._type === "questionsSection") {
      return { ...keyed, questions: SOUL_BLUEPRINT_QUESTIONS.map(({ id, question, answer }) => ({ _id: id, question, answer })) };
    }
    if (section._type === "testimonialSection") {
      return {
        ...keyed,
        testimonial: {
    _id: "testimonial-raphi",
    quote:
      "Josephine’s reading and visions really connected a lot of dots for me. It was such a beautiful invitation to trust my intuition.",
    name: "Raphi, Switzerland",
    detail: "Soul Blueprint Reading",
        },
      };
    }
    return keyed;
  }),
};

function argsFor(slug: string, extras: Partial<SanityReading> = {}) {
  const reading = readings.find((candidate) => candidate.slug === slug);
  const props = deriveBookingFormViewProps({
    readingId: slug,
    sanityReading: reading ? { ...reading, ...extras } : null,
    sanityReadings: readings,
    bookingPage: { paymentButtonText: "Continue to payment" },
    bookingForm,
    landingPage: null,
    notesState: null,
    readingNotes: [],
    giftSettings: null,
    nav: {},
  });
  if (!props) throw new Error(`no booking form props for ${slug}`);
  return props;
}

export const BOOKING_FORM_SOUL_BLUEPRINT_ARGS = argsFor("soul-blueprint", SOUL_BLUEPRINT_EXTRAS);

export const BOOKING_FORM_BIRTH_CHART_ARGS = argsFor("birth-chart");

export const BOOKING_FORM_AKASHIC_RECORD_ARGS = argsFor("akashic-record");
