import { ABOUT_DEFAULTS, type MappedAbout } from "@/data/defaults";
import { READINGS, TESTIMONIALS } from "@/data/readings";
import { SANITY_READING_PRICES } from "@/data/readings.generated";

import type {
  SanityFaqItem,
  SanityLandingPage,
  SanityReading,
  SanitySiteSettings,
  SanityTestimonial,
} from "./types";

export type MappedReading = {
  id: string;
  tag: string;
  name: string;
  price: string;
  valueProposition: string;
  briefDescription: string;
  expandedDetails: string[];
};

export type MappedTestimonial = {
  id: string | number;
  quote: string;
  name: string;
  detail: string;
};

export type { MappedAbout } from "@/data/defaults";

export type MappedNavContent = {
  brandName: string;
  navLinks: { label: string; sectionId: string }[];
  navCtaText: string;
};

export type MappedFooterContent = {
  brandName: string;
  logoUrl: string;
  copyrightText: string;
};

export type MappedFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type MappedSocialLink = {
  platform: string;
  url: string;
  label: string;
};

export function mapReadings(sanityReadings: SanityReading[]): MappedReading[] {
  if (sanityReadings.length === 0) {
    return READINGS.map((r) => ({
      id: r.id,
      tag: r.tag,
      name: r.name,
      price: SANITY_READING_PRICES[r.id] ?? r.price,
      valueProposition: r.valueProposition,
      briefDescription: r.briefDescription,
      expandedDetails: r.expandedDetails,
    }));
  }

  return sanityReadings.map((r) => ({
    id: r.slug,
    tag: r.tag,
    name: r.name,
    price: r.priceDisplay,
    valueProposition: r.valueProposition,
    briefDescription: r.briefDescription,
    expandedDetails: r.expandedDetails,
  }));
}

export function mapTestimonials(sanityTestimonials: SanityTestimonial[]): MappedTestimonial[] {
  if (sanityTestimonials.length === 0) {
    return TESTIMONIALS.map((t) => ({
      id: t.id,
      quote: t.quote,
      name: t.name,
      detail: t.detail,
    }));
  }

  return sanityTestimonials.map((t) => ({
    id: t._id,
    quote: t.quote,
    name: t.name,
    detail: t.detail,
  }));
}

export function mapAbout(landingPage: SanityLandingPage | null): MappedAbout {
  const about = landingPage?.about;
  if (!about) return ABOUT_DEFAULTS;

  return {
    sectionTag: about.sectionTag ?? ABOUT_DEFAULTS.sectionTag,
    heading: about.heading ?? ABOUT_DEFAULTS.heading,
    imageUrl: about.imageUrl ?? ABOUT_DEFAULTS.imageUrl,
    paragraphs: about.paragraphs ?? ABOUT_DEFAULTS.paragraphs,
    signoff: about.signoff ?? ABOUT_DEFAULTS.signoff,
  };
}

export function mapNavContent(
  siteSettings: SanitySiteSettings | null,
): MappedNavContent | undefined {
  if (!siteSettings) return undefined;

  return {
    brandName: siteSettings.brandName,
    navLinks: siteSettings.navLinks,
    navCtaText: siteSettings.navCtaText,
  };
}

export function mapFooterContent(
  siteSettings: SanitySiteSettings | null,
): MappedFooterContent | undefined {
  if (!siteSettings) return undefined;

  return {
    brandName: siteSettings.brandName,
    logoUrl: siteSettings.logoUrl || "/images/logo-main.webp",
    copyrightText: siteSettings.copyrightText,
  };
}

export function mapFaqItems(sanityFaqItems: SanityFaqItem[]): MappedFaqItem[] {
  return sanityFaqItems.map((item) => ({
    id: item._id,
    question: item.question,
    answer: item.answer,
  }));
}

const SAFE_URL_PROTOCOL = /^(https?:|mailto:)/;

export function mapSocialLinks(siteSettings: SanitySiteSettings | null): MappedSocialLink[] {
  if (!siteSettings) return [];

  return siteSettings.socialLinks
    .filter((link) => SAFE_URL_PROTOCOL.test(link.url))
    .map((link) => ({
      platform: link.platform,
      url: link.url,
      label: link.label,
    }));
}
