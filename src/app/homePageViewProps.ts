import { READINGS_SECTION_DEFAULTS } from "@/data/defaults";
import { faqNoteLink, notesFooterLink } from "@/lib/notes/notes";
import { notesNav } from "@/lib/notes/notesChrome";
import {
  mapAbout,
  mapFaqItems,
  mapFooterContent,
  mapReadings,
  mapSocialLinks,
  mapTestimonials,
} from "@/lib/sanity/mappers";
import { pickDefined } from "@/lib/sanity/pickDefined";
import type {
  SanityFaqItem,
  SanityLandingPage,
  SanityNotesState,
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
  notesState: SanityNotesState | null;
  faqNonce?: string;
}): HomePageViewProps {
  const { landingPage, readings, testimonials, faqItems, siteSettings, notesState, faqNonce } =
    input;
  const relatedArticleById = new Map(faqItems.map((item) => [item._id, item.relatedArticle]));
  return {
    nav: notesNav(siteSettings, notesState),
    footerContent: mapFooterContent(siteSettings),
    socialLinks: mapSocialLinks(siteSettings),
    notesLink: notesFooterLink(notesState),
    about: mapAbout(landingPage),
    readings: mapReadings(readings),
    testimonials: mapTestimonials(testimonials),
    faqItems: mapFaqItems(faqItems).map((item) => ({
      ...item,
      noteLink: faqNoteLink(notesState, relatedArticleById.get(item.id)),
    })),
    faqNonce,
    hero: landingPage?.hero ?? undefined,
    howItWorks: landingPage?.howItWorks ?? undefined,
    readingsSection: { ...READINGS_SECTION_DEFAULTS, ...pickDefined(landingPage?.readingsSection ?? {}) },
    testimonialsSection: landingPage?.testimonialsSection ?? undefined,
    contactSection: landingPage?.contactSection ?? undefined,
  };
}
