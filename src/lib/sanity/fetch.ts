import { cache } from "react";

import { sanityClient } from "./client";
import { sanityFetch } from "./live";
import {
  bookingPageQuery,
  faqItemsQuery,
  landingPageQuery,
  legalPageBySlugQuery,
  notFoundPageQuery,
  readingBySlugQuery,
  readingSlugsQuery,
  readingsQuery,
  siteSettingsQuery,
  testimonialsQuery,
  thankYouPageQuery,
  themeQuery,
  underConstructionPageQuery,
} from "./queries";
import type {
  SanityBookingPage,
  SanityFaqItem,
  SanityLandingPage,
  SanityLegalPage,
  SanityNotFoundPage,
  SanityReading,
  SanitySiteSettings,
  SanityTestimonial,
  SanityThankYouPage,
  SanityTheme,
  SanityUnderConstructionPage,
} from "./types";

/**
 * Thin wrappers around `sanityFetch` so call sites stay typed and ergonomic
 * (`const data = await fetchX()` rather than `const { data } = await ...`).
 *
 * Each function is wrapped with React `cache()` to deduplicate calls within a
 * single server request (e.g. `generateMetadata` + page component both calling
 * the same fetch). `sanityFetch` handles draft-mode switching and live
 * revalidation tagging internally; outside a request scope (e.g.
 * `generateStaticParams` at build) it falls back to the published perspective.
 */

export const fetchLandingPage = cache(async (): Promise<SanityLandingPage | null> => {
  const { data } = await sanityFetch({ query: landingPageQuery });
  return data;
});

export const fetchReadings = cache(async (): Promise<SanityReading[]> => {
  const { data } = await sanityFetch({ query: readingsQuery });
  return data ?? [];
});

export const fetchReading = cache(async (slug: string): Promise<SanityReading | null> => {
  const { data } = await sanityFetch({
    query: readingBySlugQuery,
    params: { slug },
  });
  return data;
});

/**
 * Bypasses `sanityFetch` because this is only ever called from
 * `generateStaticParams`, which runs at build time outside any HTTP request
 * scope — `sanityFetch`/`draftMode()` would throw there. Static params are
 * always sourced from published documents anyway.
 */
export async function fetchReadingSlugs(): Promise<{ slug: string }[]> {
  return (await sanityClient.fetch(readingSlugsQuery)) ?? [];
}

export const fetchTestimonials = cache(async (): Promise<SanityTestimonial[]> => {
  const { data } = await sanityFetch({ query: testimonialsQuery });
  return data ?? [];
});

export const fetchFaqItems = cache(async (): Promise<SanityFaqItem[]> => {
  const { data } = await sanityFetch({ query: faqItemsQuery });
  return data ?? [];
});

export const fetchSiteSettings = cache(async (): Promise<SanitySiteSettings | null> => {
  const { data } = await sanityFetch({ query: siteSettingsQuery });
  return data;
});

export const fetchBookingPage = cache(async (): Promise<SanityBookingPage | null> => {
  const { data } = await sanityFetch({ query: bookingPageQuery });
  return data;
});

export const fetchThankYouPage = cache(async (): Promise<SanityThankYouPage | null> => {
  const { data } = await sanityFetch({ query: thankYouPageQuery });
  return data;
});

export const fetchTheme = cache(async (): Promise<SanityTheme | null> => {
  const { data } = await sanityFetch({ query: themeQuery });
  return data;
});

export const fetchUnderConstructionPage = cache(
  async (): Promise<SanityUnderConstructionPage | null> => {
    const { data } = await sanityFetch({ query: underConstructionPageQuery });
    return data;
  },
);

export const fetchNotFoundPage = cache(async (): Promise<SanityNotFoundPage | null> => {
  const { data } = await sanityFetch({ query: notFoundPageQuery });
  return data;
});

export const fetchLegalPage = cache(async (slug: string): Promise<SanityLegalPage | null> => {
  const { data } = await sanityFetch({
    query: legalPageBySlugQuery,
    params: { slug },
  });
  return data;
});
