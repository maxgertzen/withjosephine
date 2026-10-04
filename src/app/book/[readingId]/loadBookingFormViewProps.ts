import type { NoteSummary } from "@/lib/notes/types";
import {
  fetchBookingForm,
  fetchBookingFormPublished,
  fetchBookingPage,
  fetchBookingPagePublished,
  fetchLandingPage,
  fetchLandingPagePublished,
  fetchNotesState,
  fetchNotesStatePublished,
  fetchReading,
  fetchReadingNotes,
  fetchReadingNotesPublished,
  fetchReadingPublished,
  fetchReadings,
  fetchReadingsPublished,
} from "@/lib/sanity/fetch";
import type {
  SanityBookingForm,
  SanityBookingPage,
  SanityLandingPage,
  SanityNotesState,
  SanityReading,
} from "@/lib/sanity/types";

import type { BookingFormViewProps } from "./BookingFormView";
import { deriveBookingFormViewProps } from "./deriveBookingFormViewProps";

export type BookingFormPerspective = "published" | "preview";

type BookingFormSources = {
  reading: (slug: string) => Promise<SanityReading | null>;
  readings: () => Promise<SanityReading[]>;
  bookingForm: () => Promise<SanityBookingForm | null>;
  bookingPage: () => Promise<SanityBookingPage | null>;
  landingPage: () => Promise<SanityLandingPage | null>;
  notesState: () => Promise<SanityNotesState | null>;
  readingNotes: (slug: string) => Promise<NoteSummary[]>;
};

function sourcesFor(perspective: BookingFormPerspective): BookingFormSources {
  if (perspective === "preview") {
    return {
      reading: fetchReading,
      readings: fetchReadings,
      bookingForm: fetchBookingForm,
      bookingPage: fetchBookingPage,
      landingPage: fetchLandingPage,
      notesState: fetchNotesState,
      readingNotes: fetchReadingNotes,
    };
  }
  return {
    reading: fetchReadingPublished,
    readings: fetchReadingsPublished,
    bookingForm: fetchBookingFormPublished,
    bookingPage: fetchBookingPagePublished,
    landingPage: fetchLandingPagePublished,
    notesState: fetchNotesStatePublished,
    readingNotes: fetchReadingNotesPublished,
  };
}

export async function loadBookingFormViewProps(
  readingId: string,
  perspective: BookingFormPerspective,
): Promise<BookingFormViewProps | null> {
  const sources = sourcesFor(perspective);
  const [
    sanityReading,
    sanityReadings,
    bookingForm,
    bookingPage,
    landingPage,
    notesState,
    readingNotes,
  ] = await Promise.all([
    sources.reading(readingId),
    sources.readings(),
    sources.bookingForm(),
    sources.bookingPage(),
    sources.landingPage(),
    sources.notesState(),
    sources.readingNotes(readingId),
  ]);

  return deriveBookingFormViewProps({
    readingId,
    sanityReading,
    sanityReadings,
    bookingPage,
    bookingForm,
    landingPage,
    notesState,
    readingNotes,
  });
}
