import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntryPageView } from "@/components/BookingAnalytics";
import { JsonLd } from "@/components/JsonLd/JsonLd";
import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { BookingEntryProvider } from "@/lib/intake/bookingEntryContext";
import {
  fetchBookingFormPublished,
  fetchBookingPagePublished,
  fetchLandingPagePublished,
  fetchNotesStatePublished,
  fetchReadingNotesPublished,
  fetchReadingPublished,
  fetchReadingsPublished,
} from "@/lib/sanity/fetch";
import { BOOKING_FALLBACK_TITLE, buildPageMetadata, readingPageTitle } from "@/lib/seoMetadata";
import { readingProductJsonLd } from "@/lib/structuredData";

import { BookingFormView } from "./BookingFormView";
import { deriveBookingFormViewProps } from "./deriveBookingFormViewProps";

export { generateReadingStaticParams as generateStaticParams };

type BookingPageProps = {
  params: Promise<{ readingId: string }>;
};

export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { readingId } = await params;
  const [sanityReading, bookingPage] = await Promise.all([
    fetchReadingPublished(readingId),
    fetchBookingPagePublished(),
  ]);

  const subtitle = (sanityReading ?? getReadingById(readingId))?.subtitle;

  const title =
    sanityReading?.seo?.metaTitle ||
    (subtitle ? readingPageTitle(subtitle, sanityReading?.priceDisplay) : BOOKING_FALLBACK_TITLE);

  const description =
    sanityReading?.seo?.metaDescription ??
    bookingPage?.seo?.metaDescription ??
    "Choose your reading and share your details. Your voice note and PDF will be with you within 7 days.";

  const seo = sanityReading?.seo ?? bookingPage?.seo;

  return buildPageMetadata({ title, description, path: `/book/${readingId}`, seo });
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { readingId } = await params;

  const [
    sanityReading,
    sanityReadings,
    bookingForm,
    bookingPage,
    landingPage,
    notesState,
    readingNotes,
  ] = await Promise.all([
    fetchReadingPublished(readingId),
    fetchReadingsPublished(),
    fetchBookingFormPublished(),
    fetchBookingPagePublished(),
    fetchLandingPagePublished(),
    fetchNotesStatePublished(),
    fetchReadingNotesPublished(readingId),
  ]);

  const props = deriveBookingFormViewProps({
    readingId,
    sanityReading,
    sanityReadings,
    bookingPage,
    bookingForm,
    landingPage,
    notesState,
    readingNotes,
  });
  if (!props) {
    notFound();
  }

  const fallbackReading = getReadingById(readingId);
  const productJsonLd = readingProductJsonLd({
    name: props.reading.name,
    description: sanityReading?.briefDescription ?? fallbackReading?.briefDescription ?? "",
    price: props.reading.priceLabel,
    path: `/book/${readingId}`,
    image: sanityReading?.seo?.ogImage?.asset?.url,
  });

  return (
    <BookingEntryProvider key={props.reading.slug} readingId={props.reading.slug}>
      <JsonLd data={productJsonLd} />
      <BookingFormView {...props} />
      <EntryPageView readingId={props.reading.slug} />
    </BookingEntryProvider>
  );
}
