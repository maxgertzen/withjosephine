import {
  mapAbout,
  mapFaqItems,
  mapFooterContent,
  mapNavContent,
  mapReadings,
  mapSocialLinks,
  mapTestimonials,
} from "@/lib/sanity/mappers";
import type {
  SanityFaqItem,
  SanityLandingPage,
  SanityReading,
  SanitySiteSettings,
  SanityTestimonial,
} from "@/lib/sanity/types";

import type { HomePageViewProps } from "./HomePageView";

/**
 * Shared mapping from raw Sanity documents to HomePageView props. The public
 * page (static, published data) and the /preview surface (draft data) both
 * call this so they render identically and cannot drift.
 */
export function toHomePageViewProps(input: {
  landingPage: SanityLandingPage | null;
  readings: SanityReading[];
  testimonials: SanityTestimonial[];
  faqItems: SanityFaqItem[];
  siteSettings: SanitySiteSettings | null;
  faqNonce?: string;
}): HomePageViewProps {
  const { landingPage, readings, testimonials, faqItems, siteSettings, faqNonce } = input;
  return {
    navContent: mapNavContent(siteSettings),
    footerContent: mapFooterContent(siteSettings),
    socialLinks: mapSocialLinks(siteSettings),
    about: mapAbout(landingPage),
    readings: mapReadings(readings),
    testimonials: mapTestimonials(testimonials),
    faqItems: mapFaqItems(faqItems),
    faqNonce,
    hero: landingPage?.hero ?? undefined,
    howItWorks: landingPage?.howItWorks ?? undefined,
    readingsSection: landingPage?.readingsSection ?? undefined,
    testimonialsSection: landingPage?.testimonialsSection ?? undefined,
    contactSection: landingPage?.contactSection ?? undefined,
  };
}
