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
  try {
    return await sanityClient.fetch(landingPageQuery);
  } catch (error) {
    console.error("fetchLandingPage failed:", error);
    return null;
  }
}

export async function fetchReadings(): Promise<SanityReading[]> {
  try {
    return await sanityClient.fetch(readingsQuery);
  } catch (error) {
    console.error("fetchReadings failed:", error);
    return [];
  }
}

export async function fetchReading(slug: string): Promise<SanityReading | null> {
  try {
    return await sanityClient.fetch(readingBySlugQuery, { slug });
  } catch (error) {
    console.error("fetchReading failed:", error);
    return null;
  }
}

export async function fetchReadingSlugs(): Promise<{ slug: string }[]> {
  try {
    return await sanityClient.fetch(readingSlugsQuery);
  } catch (error) {
    console.error("fetchReadingSlugs failed:", error);
    return [];
  }
}

export async function fetchTestimonials(): Promise<SanityTestimonial[]> {
  try {
    return await sanityClient.fetch(testimonialsQuery);
  } catch (error) {
    console.error("fetchTestimonials failed:", error);
    return [];
  }
}

export async function fetchFaqItems(): Promise<SanityFaqItem[]> {
  try {
    return await sanityClient.fetch(faqItemsQuery);
  } catch (error) {
    console.error("fetchFaqItems failed:", error);
    return [];
  }
}

export async function fetchSiteSettings(): Promise<SanitySiteSettings | null> {
  try {
    return await sanityClient.fetch(siteSettingsQuery);
  } catch (error) {
    console.error("fetchSiteSettings failed:", error);
    return null;
  }
}

export async function fetchBookingPage(): Promise<SanityBookingPage | null> {
  try {
    return await sanityClient.fetch(bookingPageQuery);
  } catch (error) {
    console.error("fetchBookingPage failed:", error);
    return null;
  }
}

export async function fetchThankYouPage(): Promise<SanityThankYouPage | null> {
  try {
    return await sanityClient.fetch(thankYouPageQuery);
  } catch (error) {
    console.error("fetchThankYouPage failed:", error);
    return null;
  }
}

export async function fetchTheme(): Promise<SanityTheme | null> {
  try {
    return await sanityClient.fetch(themeQuery);
  } catch (error) {
    console.error("fetchTheme failed:", error);
    return null;
  }
}
