import { cache } from "react";
import { draftMode } from "next/headers";
import type { SanityClient } from "@sanity/client";
import { sanityClient, sanityPreviewClient } from "./client";
import {
  landingPageQuery,
  readingsQuery,
  readingBySlugQuery,
  readingSlugsQuery,
  testimonialsQuery,
  faqItemsQuery,
  siteSettingsQuery,
  bookingPageQuery,
  thankYouPageQuery,
  themeQuery,
  legalPageBySlugQuery,
} from "./queries";
import type {
  SanityLandingPage,
  SanityReading,
  SanityTestimonial,
  SanityFaqItem,
  SanitySiteSettings,
  SanityBookingPage,
  SanityThankYouPage,
  SanityTheme,
  SanityLegalPage,
} from "./types";

/**
 * Pick the right Sanity client for the current request.
 *
 * When `draftMode()` is enabled (via the Studio's Presentation iframe hitting
 * `/api/draft/enable?secret=...`), we fetch from the `previewDrafts`
 * perspective so Josephine sees unpublished edits. Otherwise we serve the
 * published CDN-cached perspective.
 *
 * `draftMode()` throws when called outside a request scope (e.g. during
 * `generateStaticParams` at build time). In that case the public client is
 * always the correct choice — static params are derived from published data.
 */
async function getClient(): Promise<SanityClient> {
  try {
    const { isEnabled } = await draftMode();
    return isEnabled ? sanityPreviewClient : sanityClient;
  } catch {
    return sanityClient;
  }
}

export async function fetchLandingPage(): Promise<SanityLandingPage | null> {
  return (await getClient()).fetch(landingPageQuery);
}

export async function fetchReadings(): Promise<SanityReading[]> {
  return (await getClient()).fetch(readingsQuery);
}

export async function fetchReading(slug: string): Promise<SanityReading | null> {
  return (await getClient()).fetch(readingBySlugQuery, { slug });
}

export async function fetchReadingSlugs(): Promise<{ slug: string }[]> {
  return (await getClient()).fetch(readingSlugsQuery);
}

export async function fetchTestimonials(): Promise<SanityTestimonial[]> {
  return (await getClient()).fetch(testimonialsQuery);
}

export async function fetchFaqItems(): Promise<SanityFaqItem[]> {
  return (await getClient()).fetch(faqItemsQuery);
}

export async function fetchSiteSettings(): Promise<SanitySiteSettings | null> {
  return (await getClient()).fetch(siteSettingsQuery);
}

export async function fetchBookingPage(): Promise<SanityBookingPage | null> {
  return (await getClient()).fetch(bookingPageQuery);
}

export async function fetchThankYouPage(): Promise<SanityThankYouPage | null> {
  return (await getClient()).fetch(thankYouPageQuery);
}

export async function fetchTheme(): Promise<SanityTheme | null> {
  return (await getClient()).fetch(themeQuery);
}

export const fetchLegalPage = cache(
  async (slug: string): Promise<SanityLegalPage | null> => {
    return (await getClient()).fetch(legalPageBySlugQuery, { slug });
  },
);
