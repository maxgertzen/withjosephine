import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import {
  fetchBookingFormPublished,
  fetchBookingPagePublished,
  fetchReadingPublished,
} from "@/lib/sanity/fetch";
import { buildOpenGraph } from "@/lib/seoMetadata";

import { deriveLetterViewProps } from "./deriveLetterViewProps";
import { LetterView } from "./LetterView";

export { generateReadingStaticParams as generateStaticParams };

type LetterPageProps = {
  params: Promise<{ readingId: string }>;
};

export async function generateMetadata({ params }: LetterPageProps): Promise<Metadata> {
  const { readingId } = await params;
  const [sanityReading, bookingPage] = await Promise.all([
    fetchReadingPublished(readingId),
    fetchBookingPagePublished(),
  ]);

  const readingName = (sanityReading ?? getReadingById(readingId))?.name;
  const title =
    sanityReading?.seo?.metaTitle ??
    bookingPage?.seo?.metaTitle ??
    (readingName ? `Tell me about you — ${readingName}` : "Tell me about you — Josephine");
  const description =
    sanityReading?.seo?.metaDescription ??
    bookingPage?.seo?.metaDescription ??
    "A short note from Josephine before you share your details.";
  const seo = sanityReading?.seo ?? bookingPage?.seo;

  return {
    title,
    description,
    openGraph: buildOpenGraph(seo),
    robots: { index: false, follow: false },
  };
}

export default async function LetterPage({ params }: LetterPageProps) {
  const { readingId } = await params;

  const [sanityReading, bookingForm] = await Promise.all([
    fetchReadingPublished(readingId),
    fetchBookingFormPublished(),
  ]);

  const props = deriveLetterViewProps({ readingId, sanityReading, bookingForm });
  if (!props) {
    notFound();
  }

  return <LetterView {...props} />;
}
