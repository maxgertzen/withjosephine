import type { Metadata } from "next";

import { getReadingById } from "@/data/readings";
import { bookingPath } from "@/lib/http/routes";
import { fetchBookingPagePublished, fetchReadingPublished } from "@/lib/sanity/fetch";
import { BOOKING_FALLBACK_TITLE, buildPageMetadata, readingPageTitle } from "@/lib/seoMetadata";

export async function loadReadingPageMetadata(readingId: string): Promise<Metadata> {
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

  return buildPageMetadata({ title, description, path: bookingPath(readingId), seo });
}
