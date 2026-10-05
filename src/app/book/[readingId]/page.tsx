import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntryPageView } from "@/components/BookingAnalytics";
import { JsonLd } from "@/components/JsonLd/JsonLd";
import { ReadingFoldPrePaint } from "@/components/ReadingBlock/ReadingFoldPrePaint";
import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { bookingPath } from "@/lib/http/routes";
import { BookingEntryProvider } from "@/lib/intake/bookingEntryContext";
import { fetchReadingPublished } from "@/lib/sanity/fetch";
import { readingProductJsonLd } from "@/lib/structuredData";

import { BookingFormView } from "./BookingFormView";
import { loadBookingFormViewProps } from "./loadBookingFormViewProps";
import { loadReadingPageMetadata } from "./readingPageMetadata";

export { generateReadingStaticParams as generateStaticParams };

type BookingPageProps = {
  params: Promise<{ readingId: string }>;
};

export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { readingId } = await params;
  return loadReadingPageMetadata(readingId);
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { readingId } = await params;

  const [props, sanityReading] = await Promise.all([
    loadBookingFormViewProps(readingId, "published"),
    fetchReadingPublished(readingId),
  ]);
  if (!props) {
    notFound();
  }

  const fallbackReading = getReadingById(readingId);
  const productJsonLd = readingProductJsonLd({
    name: props.reading.name,
    description: sanityReading?.briefDescription ?? fallbackReading?.briefDescription ?? "",
    price: props.reading.priceLabel,
    path: bookingPath(readingId),
    image: sanityReading?.seo?.ogImage?.asset?.url,
  });

  return (
    <BookingEntryProvider key={props.reading.slug} readingId={props.reading.slug}>
      <JsonLd data={productJsonLd} />
      <ReadingFoldPrePaint slug={props.reading.slug} />
      <BookingFormView {...props} />
      <EntryPageView readingId={props.reading.slug} />
    </BookingEntryProvider>
  );
}
