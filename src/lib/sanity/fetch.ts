import { sanityClient } from "./client";
import { sanityFetch } from "./live";
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
 * Thin wrappers around `sanityFetch` so call sites stay typed and ergonomic
 * (`const data = await fetchX()` rather than `const { data } = await ...`).
 *
 * `sanityFetch` handles draft-mode switching and live revalidation tagging
 * internally; outside a request scope (e.g. `generateStaticParams` at build)
 * it falls back to the published perspective.
 */

export async function fetchLandingPage(): Promise<SanityLandingPage | null> {
  const { data } = await sanityFetch({ query: landingPageQuery });
  return data;
}

export async function fetchReadings(): Promise<SanityReading[]> {
  const { data } = await sanityFetch({ query: readingsQuery });
  return data ?? [];
}

export async function fetchReading(slug: string): Promise<SanityReading | null> {
  const { data } = await sanityFetch({
    query: readingBySlugQuery,
    params: { slug },
  });
  return data;
}

/**
 * Bypasses `sanityFetch` because this is only ever called from
 * `generateStaticParams`, which runs at build time outside any HTTP request
 * scope — `sanityFetch`/`draftMode()` would throw there. Static params are
 * always sourced from published documents anyway.
 */
export async function fetchReadingSlugs(): Promise<{ slug: string }[]> {
  return (await sanityClient.fetch(readingSlugsQuery)) ?? [];
}

export async function fetchTestimonials(): Promise<SanityTestimonial[]> {
  const { data } = await sanityFetch({ query: testimonialsQuery });
  return data ?? [];
}

export async function fetchFaqItems(): Promise<SanityFaqItem[]> {
  const { data } = await sanityFetch({ query: faqItemsQuery });
  return data ?? [];
}

export async function fetchSiteSettings(): Promise<SanitySiteSettings | null> {
  const { data } = await sanityFetch({ query: siteSettingsQuery });
  return data;
}

export async function fetchBookingPage(): Promise<SanityBookingPage | null> {
  const { data } = await sanityFetch({ query: bookingPageQuery });
  return data;
}

export async function fetchThankYouPage(): Promise<SanityThankYouPage | null> {
  const { data } = await sanityFetch({ query: thankYouPageQuery });
  return data;
}

export async function fetchTheme(): Promise<SanityTheme | null> {
  const { data } = await sanityFetch({ query: themeQuery });
  return data;
}

export async function fetchLegalPage(slug: string): Promise<SanityLegalPage | null> {
  const { data } = await sanityFetch({
    query: legalPageBySlugQuery,
    params: { slug },
  });
  return data;
}
