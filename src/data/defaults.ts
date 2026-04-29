export interface HeroContent {
  tagline: string;
  introGreeting: string;
  introBody: string;
  ctaText: string;
}

export const HERO_DEFAULTS: HeroContent = {
  tagline: "Astrologer  +  Akashic Record Reader",
  introGreeting: "Hi, I\u2019m Josephine.",
  introBody:
    "I combine your birth chart and Akashic Records to help you understand your soul more deeply. Your patterns, your purpose and your path.\n\nIf you\u2019re here, you\u2019re probably ready to understand yourself on a level that changes everything. Abundance, clarity, the right relationships, a real sense of direction. It\u2019s all in there.",
  ctaText: "Explore Readings",
};

export interface FooterContent {
  brandName: string;
  logoUrl?: string;
  copyrightText: string;
}

export const FOOTER_DEFAULTS: FooterContent = {
  brandName: "Josephine",
  logoUrl: "/images/logo-default.png",
  copyrightText: "Josephine. All rights reserved.",
};

export interface ContactFormContent {
  sectionTag: string;
  heading: string;
  description: string;
  submitText: string;
}

export const CONTACT_DEFAULTS: ContactFormContent = {
  sectionTag: "\u2726 Get in Touch",
  heading: "i\u2019d love to hear from you",
  description:
    "If you have a question before you book, or you\u2019d simply like to say hello, please don\u2019t hesitate to reach out. I read every message personally.",
  submitText: "Send Message",
};

export interface HowItWorksStep {
  title: string;
  description: string;
}

export interface HowItWorksContent {
  sectionTag: string;
  heading: string;
  steps: HowItWorksStep[];
}

export const HOW_IT_WORKS_DEFAULTS: HowItWorksContent = {
  sectionTag: "\u2726 Process",
  heading: "how it works",
  steps: [
    {
      title: "Choose Your Reading",
      description:
        "Browse the offerings above, select the reading that calls to you, and complete your payment securely.",
    },
    {
      title: "Share Your Details",
      description:
        "After payment, I\u2019ll send you everything you need \u2014 a simple form for your birth details and a personalised question menu.",
    },
    {
      title: "Receive Your Reading",
      description:
        "Within 7 days, you\u2019ll receive a detailed voice note recording and a supporting PDF created entirely for you.",
    },
  ],
};

export interface MappedAbout {
  sectionTag: string;
  heading: string;
  imageUrl: string;
  paragraphs: string[];
  signoff: string;
}

export interface EntryPageContent {
  letterOpener: string;
  letterBridge: string;
  letterClosing: string;
  dropCapCta: string;
  dropCapCaption: string;
  changeReadingLinkText: string;
  aboutJosephineLinkText: string;
}

export const ENTRY_PAGE_DEFAULTS: EntryPageContent = {
  letterOpener:
    "Before I read for you, I want to know a little about you. A few details, a few questions you\u2019d like held.",
  letterBridge: "Take your time with this. There\u2019s no wrong answer.",
  letterClosing:
    "I can\u2019t wait to connect with you through your reading.\nWith love, Josephine \u2726",
  dropCapCta: "Tell me about you \u2192",
  dropCapCaption:
    "The intake form \u2014 about five minutes. You\u2019ll review before paying.",
  changeReadingLinkText: "Reading a different one? See all three \u2192",
  aboutJosephineLinkText: "About Josephine",
};

export interface BookingInfoNotes {
  deliveryNote: string;
  deliverableNote: string;
}

export const BOOKING_INFO_DEFAULTS: BookingInfoNotes = {
  deliveryNote: "You\u2019ll receive your voice note and PDF within 7 days of payment.",
  deliverableNote:
    "Detailed voice note recording + a supporting PDF created entirely for you.",
};

export const ABOUT_DEFAULTS: MappedAbout = {
  sectionTag: "\u2726 About",
  heading: "who i am + what this is",
  imageUrl: "/images/akasha.webp",
  paragraphs: [
    "I found this work through my own search for purpose. Wanting to understand myself more deeply, why I was the way I was, what I was here for, why certain patterns kept showing up \u2014 this led me to astrology and then to the Akashic Records.",
    "These two things together changed everything for me. And now I use them as a bridge for others. Astrology maps your soul\u2019s blueprint through your birth chart. Your gifts, your wounds, your patterns and your path.",
    "The Akashic Records go even deeper. They\u2019re a spiritual record of your soul across time. Every experience, every contract, every lesson your soul has carried into this lifetime.",
    "Together they create a level of understanding that\u2019s hard to describe until you\u2019ve experienced it.",
  ],
  signoff: "Josephine",
};
