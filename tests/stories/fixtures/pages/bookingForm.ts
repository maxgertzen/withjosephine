import { deriveBookingFormViewProps } from "@/app/book/[readingId]/deriveBookingFormViewProps";
import { SOUL_BLUEPRINT_BLOCK } from "@/components/ReadingBlock/readingBlockFixture";
import type { SanityBookingForm, SanityReading } from "@/lib/sanity/types";

import bookingFormFixture from "../../../../src/__fixtures__/sanity/e2e/bookingForm.json";
import readingsFixture from "../../../../src/__fixtures__/sanity/e2e/readings.json";

const readings = readingsFixture as unknown as SanityReading[];
const bookingForm = bookingFormFixture as unknown as SanityBookingForm;

const SOUL_BLUEPRINT_EXTRAS: Partial<SanityReading> = {
  estimatedMinutes: 4,
  questionsOnPage: SOUL_BLUEPRINT_BLOCK.questions.items.map(({ id, question, answer }) => ({
    _id: id,
    question,
    answer,
  })),
  formTestimonial: {
    _id: "testimonial-raphi",
    quote:
      "Josephine’s reading and visions really connected a lot of dots for me. It was such a beautiful invitation to trust my intuition.",
    name: "Raphi, Switzerland",
    detail: "Soul Blueprint Reading",
  },
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
  });
  if (!props) throw new Error(`no booking form props for ${slug}`);
  return props;
}

export const BOOKING_FORM_SOUL_BLUEPRINT_ARGS = argsFor("soul-blueprint", SOUL_BLUEPRINT_EXTRAS);

export const BOOKING_FORM_BIRTH_CHART_ARGS = argsFor("birth-chart");

export const BOOKING_FORM_AKASHIC_RECORD_ARGS = argsFor("akashic-record");
