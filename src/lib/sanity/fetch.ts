import { sanityClient } from "./client";
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
} from "./types";

export async function fetchLandingPage(): Promise<SanityLandingPage | null> {
  return sanityClient.fetch(landingPageQuery);
}

export async function fetchReadings(): Promise<SanityReading[]> {
  return sanityClient.fetch(readingsQuery);
}

export async function fetchReading(slug: string): Promise<SanityReading | null> {
  return sanityClient.fetch(readingBySlugQuery, { slug });
}

export async function fetchReadingSlugs(): Promise<{ slug: string }[]> {
  return sanityClient.fetch(readingSlugsQuery);
}

export async function fetchTestimonials(): Promise<SanityTestimonial[]> {
  return sanityClient.fetch(testimonialsQuery);
}

export async function fetchFaqItems(): Promise<SanityFaqItem[]> {
  return sanityClient.fetch(faqItemsQuery);
}

export async function fetchSiteSettings(): Promise<SanitySiteSettings | null> {
  return sanityClient.fetch(siteSettingsQuery);
}

export async function fetchBookingPage(): Promise<SanityBookingPage | null> {
  return sanityClient.fetch(bookingPageQuery);
}

export async function fetchThankYouPage(): Promise<SanityThankYouPage | null> {
  return sanityClient.fetch(thankYouPageQuery);
}

export async function fetchTheme(): Promise<SanityTheme | null> {
  return sanityClient.fetch(themeQuery);
}
