import { deriveBookingFormViewProps } from "@/app/book/[readingId]/deriveBookingFormViewProps";
import {
  fetchBookingForm,
  fetchBookingPage,
  fetchLandingPage,
  fetchNotesState,
  fetchReading,
  fetchReadingNotes,
  fetchReadings,
} from "@/lib/sanity/fetch";

export async function loadPreviewBookingFormProps(slug: string) {
  const [
    sanityReading,
    sanityReadings,
    bookingPage,
    bookingForm,
    landingPage,
    notesState,
    readingNotes,
  ] = await Promise.all([
    fetchReading(slug),
    fetchReadings(),
    fetchBookingPage(),
    fetchBookingForm(),
    fetchLandingPage(),
    fetchNotesState(),
    fetchReadingNotes(slug),
  ]);

  return deriveBookingFormViewProps({
    readingId: slug,
    sanityReading,
    sanityReadings,
    bookingPage,
    bookingForm,
    landingPage,
    notesState,
    readingNotes,
  });
}
