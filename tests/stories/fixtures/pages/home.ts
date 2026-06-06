import type { HomePageViewProps } from "@/app/HomePageView";
import { ABOUT_DEFAULTS, CONTACT_DEFAULTS, HERO_DEFAULTS } from "@/data/defaults";
import { READINGS, TESTIMONIALS } from "@/data/readings";
import type {
  MappedFaqItem,
  MappedFooterContent,
  MappedNavContent,
} from "@/lib/sanity/mappers";

const NAV: MappedNavContent = {
  brandName: "Josephine",
  navLinks: [
    { label: "About", sectionId: "about" },
    { label: "Readings", sectionId: "readings" },
    { label: "FAQ", sectionId: "faq" },
  ],
  navCtaText: "Book a Reading",
};

const FOOTER: MappedFooterContent = {
  brandName: "Josephine",
  logoUrl: "/images/logo-main.webp",
  copyrightText: "Josephine. All rights reserved.",
};

const HOME_STORY_FAQ_FIXTURES: MappedFaqItem[] = [
  {
    id: "delivery",
    question: "How is a reading delivered?",
    answer:
      "You'll receive a voice note plus a written PDF within seven days. The link to your reading stays accessible for 90 days afterwards.",
  },
  {
    id: "birth-time",
    question: "Do I need to know my birth time?",
    answer:
      "Knowing your exact time is helpful but not required. If you don't know it, the reading focuses on the elements that don't depend on the hour.",
  },
  {
    id: "gifting",
    question: "Can I gift a reading to someone else?",
    answer:
      "Yes. Gift readings let you cover the cost, choose delivery timing, and let the recipient fill in their own intake details when they're ready.",
  },
];

export const HOME_STORY_PROPS: HomePageViewProps = {
  navContent: NAV,
  footerContent: FOOTER,
  socialLinks: [],
  about: ABOUT_DEFAULTS,
  readings: READINGS.map((reading) => ({
    id: reading.id,
    tag: reading.tag,
    name: reading.name,
    price: reading.price,
    valueProposition: reading.valueProposition,
    briefDescription: reading.briefDescription,
    expandedDetails: reading.expandedDetails,
  })),
  testimonials: TESTIMONIALS.map((testimonial) => ({
    id: testimonial.id,
    quote: testimonial.quote,
    name: testimonial.name,
    detail: testimonial.detail,
  })),
  faqItems: HOME_STORY_FAQ_FIXTURES,
  hero: {
    tagline: HERO_DEFAULTS.tagline,
    introGreeting: HERO_DEFAULTS.introGreeting,
    introBody: HERO_DEFAULTS.introBody,
    ctaText: HERO_DEFAULTS.ctaText,
  },
  contactSection: CONTACT_DEFAULTS,
};
