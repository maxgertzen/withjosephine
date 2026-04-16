import { READINGS, TESTIMONIALS } from "@/data/readings";

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

export type MappedAbout = {
  sectionTag: string;
  heading: string;
  imageUrl: string;
  paragraphs: string[];
  signoff: string;
};

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

const ABOUT_DEFAULTS: MappedAbout = {
  sectionTag: "\u2726 About",
  heading: "who i am + what this is",
  imageUrl: "/images/akasha.png",
  paragraphs: [
    "I found this work through my own search for purpose. Wanting to understand myself more deeply, why I was the way I was, what I was here for, why certain patterns kept showing up \u2014 this led me to astrology and then to the Akashic Records.",
    "These two things together changed everything for me. And now I use them as a bridge for others. Astrology maps your soul\u2019s blueprint through your birth chart. Your gifts, your wounds, your patterns and your path.",
    "The Akashic Records go even deeper. They\u2019re a spiritual record of your soul across time. Every experience, every contract, every lesson your soul has carried into this lifetime.",
    "Together they create a level of understanding that\u2019s hard to describe until you\u2019ve experienced it.",
  ],
  signoff: "Josephine",
};

export function mapReadings(sanityReadings: SanityReading[]): MappedReading[] {
  if (sanityReadings.length === 0) {
    return READINGS.map((r) => ({
      id: r.id,
      tag: r.tag,
      name: r.name,
      price: r.price,
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
    logoUrl: siteSettings.logoUrl || "/images/logo-default.png",
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
