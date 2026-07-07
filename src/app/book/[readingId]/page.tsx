import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import {
  fetchBookingFormPublished,
  fetchBookingPagePublished,
  fetchReadingPublished,
} from "@/lib/sanity/fetch";
import { buildOpenGraph } from "@/lib/seoMetadata";

import { BookingEntryView } from "./BookingEntryView";
import { deriveBookingEntryProps } from "./deriveBookingEntryProps";

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

  const readingName = (sanityReading ?? getReadingById(readingId))?.name;

  const title =
    sanityReading?.seo?.metaTitle ??
    bookingPage?.seo?.metaTitle ??
    (readingName ? `Book ${readingName} — Josephine` : "Book a Reading — Josephine");

  const description =
    sanityReading?.seo?.metaDescription ??
    bookingPage?.seo?.metaDescription ??
    "Choose your reading and share your details. Your voice note and PDF will be with you within 7 days.";

  const seo = sanityReading?.seo ?? bookingPage?.seo;

  return {
    title,
    description,
    alternates: { canonical: `/book/${readingId}` },
    openGraph: buildOpenGraph(seo),
  };
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { readingId } = await params;

  const [sanityReading, bookingPage, bookingForm] = await Promise.all([
    fetchReadingPublished(readingId),
    fetchBookingPagePublished(),
    fetchBookingFormPublished(),
  ]);

  const props = deriveBookingEntryProps({
    readingId,
    sanityReading,
    bookingPage,
    bookingForm,
  });
  if (!props) {
    notFound();
  }

  return <BookingEntryView {...props} />;
}
