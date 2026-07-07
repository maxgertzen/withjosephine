import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd/JsonLd";
import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import {
  fetchBookingFormPublished,
  fetchBookingPagePublished,
  fetchReadingPublished,
} from "@/lib/sanity/fetch";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { readingProductJsonLd } from "@/lib/structuredData";

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

  return buildPageMetadata({ title, description, path: `/book/${readingId}`, seo });
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

  const fallbackReading = getReadingById(readingId);
  const productJsonLd = readingProductJsonLd({
    name: sanityReading?.name ?? fallbackReading?.name ?? "Soul Reading",
    description: sanityReading?.briefDescription ?? fallbackReading?.briefDescription ?? "",
    price: sanityReading?.priceDisplay ?? fallbackReading?.price ?? "",
    path: `/book/${readingId}`,
  });

  return (
    <>
      <JsonLd data={productJsonLd} />
      <BookingEntryView {...props} />
    </>
  );
}
