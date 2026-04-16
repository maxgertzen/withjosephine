/**
 * Seed Sanity with current hardcoded content.
 *
 * Usage:
 *   SANITY_PROJECT_ID=xxx SANITY_DATASET=production npx tsx scripts/seed-sanity.ts
 */

import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN!,
});

async function seed() {
  const transaction = client.transaction();

  // --- Readings ---
  const readings = [
    {
      _id: "reading-soul-blueprint",
      _type: "reading" as const,
      name: "The Soul Blueprint",
      slug: { _type: "slug" as const, current: "soul-blueprint" },
      tag: "Signature",
      subtitle: "Soul Blueprint Reading",
      price: 17900,
      priceDisplay: "$179",
      valueProposition: "The most complete picture of your soul I can give you",
      briefDescription:
        "My signature offering combining your birth chart, Akashic Records and card pulls to reveal your purpose, past lives, and ancestral patterns.",
      expandedDetails: [
        "This is honestly something really unusual. It weaves together three powerful modalities to create the deepest, most complete understanding of who you are and why you're here.",
        "I'll send you a personalised question menu before your reading so you can choose what you most want to explore. Nothing is generic. Everything is specific to you.",
        "Delivered as a detailed voice note and a supporting PDF within 7 days of payment.",
      ],
      bookingSummary:
        "My most comprehensive reading. Your birth chart, Akashic Records and card pulls woven together to create the deepest, most complete picture of your soul I can give you.",
      includes: [
        "In-depth birth chart analysis",
        "Akashic Record reading with card pulls",
        "Your purpose, past lives & ancestral patterns",
        "Personalised question menu sent in advance",
        "Detailed voice note recording",
        "Supporting PDF — entirely bespoke",
      ],
      requiresBirthChart: true,
      requiresAkashic: true,
      requiresQuestions: true,
      order: 0,
    },
    {
      _id: "reading-birth-chart",
      _type: "reading" as const,
      name: "The Birth Chart Reading",
      slug: { _type: "slug" as const, current: "birth-chart" },
      tag: "Astrology",
      subtitle: "Birth Chart Reading",
      price: 9900,
      priceDisplay: "$99",
      valueProposition: "Understand yourself in a way that makes sense of your life",
      briefDescription:
        "A deep dive into your chart revealing your core themes, gifts, patterns and what the current stars are saying about where you are right now.",
      expandedDetails: [
        "Astrology at this level isn't about your sun sign. It's about the specific energies, timing and patterns that shape your experience.",
        "We'll look at your natal chart and the current transits affecting you, so you understand both who you are and what's unfolding for you now.",
        "Delivered as a detailed voice note and a supporting PDF within 7 days of payment.",
      ],
      bookingSummary:
        "A deep dive into your chart. Your core themes, gifts, patterns — and what the current stars are saying about where you are right now.",
      includes: [
        "Full natal chart analysis",
        "Your gifts, wounds and soul patterns",
        "Current transits and what they mean for you",
        "Detailed voice note recording",
        "Supporting PDF — entirely bespoke",
      ],
      requiresBirthChart: true,
      requiresAkashic: false,
      requiresQuestions: false,
      order: 1,
    },
    {
      _id: "reading-akashic-record",
      _type: "reading" as const,
      name: "The Akashic Record Reading",
      slug: { _type: "slug" as const, current: "akashic-record" },
      tag: "Soul Records",
      subtitle: "Akashic Record Reading",
      price: 7900,
      priceDisplay: "$79",
      valueProposition: "Direct answers from your soul's infinite records",
      briefDescription:
        "You choose three questions, I open your records, tune in and pull a card for each. The most direct way to access what your soul already knows.",
      expandedDetails: [
        "The Akashic Records hold everything your soul has experienced across time. Sometimes the clearest guidance comes from simply asking the right question.",
        "I'll send you a question menu so you can choose what feels most relevant to you right now. Three questions, three clear answers.",
        "Delivered as a detailed voice note and a supporting PDF within 7 days of payment.",
      ],
      bookingSummary:
        "You choose three questions, I open your records and pull a card for each. The most direct way to access what your soul already knows.",
      includes: [
        "Three questions explored in depth",
        "Akashic Record reading with card pulls",
        "Personalised question menu sent in advance",
        "Detailed voice note recording",
        "Supporting PDF — entirely bespoke",
      ],
      requiresBirthChart: false,
      requiresAkashic: true,
      requiresQuestions: true,
      order: 2,
    },
  ];

  for (const reading of readings) {
    transaction.createOrReplace(reading);
  }

  // --- Testimonials ---
  const testimonials = [
    {
      _id: "testimonial-1",
      _type: "testimonial" as const,
      quote:
        "I've had many readings over the years but nothing has come close to this. Josephine saw things in my chart and records that I had never spoken out loud to anyone. I listened to my voice note three times and cried each time — in the best possible way.",
      name: "Amelia R.",
      readingType: { _type: "reference" as const, _ref: "reading-soul-blueprint" },
      detailOverride: "Soul Blueprint Reading",
      order: 0,
    },
    {
      _id: "testimonial-2",
      _type: "testimonial" as const,
      quote:
        "The Akashic reading answered the question I'd been circling for years. The accuracy was startling, and the warmth Josephine brought to it made everything feel safe. My PDF has been on my desk ever since.",
      name: "Charlotte M.",
      readingType: { _type: "reference" as const, _ref: "reading-akashic-record" },
      detailOverride: "Akashic Record Reading",
      order: 1,
    },
    {
      _id: "testimonial-3",
      _type: "testimonial" as const,
      quote:
        "I booked the birth chart reading not really knowing what to expect. What I got was a level of self-understanding I didn't know was possible. It reframed everything. I finally understand why I am the way I am.",
      name: "Isabelle K.",
      readingType: { _type: "reference" as const, _ref: "reading-birth-chart" },
      detailOverride: "Birth Chart Reading",
      order: 2,
    },
  ];

  for (const testimonial of testimonials) {
    transaction.createOrReplace(testimonial);
  }

  // --- Landing Page ---
  transaction.createOrReplace({
    _id: "landingPage",
    _type: "landingPage",
    hero: {
      tagline: "Astrologer  +  Akashic Record Reader",
      introGreeting: "Hi, I'm Josephine.",
      introBody:
        "I combine your birth chart and Akashic Records to help you understand your soul more deeply. Your patterns, your purpose and your path.\n\nIf you're here, you're probably ready to understand yourself on a level that changes everything. Abundance, clarity, the right relationships, a real sense of direction. It's all in there.",
      ctaText: "Explore Readings",
    },
    about: {
      sectionTag: "✦ About",
      heading: "who i am + what this is",
      paragraphs: [
        "I found this work through my own search for purpose. Wanting to understand myself more deeply, why I was the way I was, what I was here for, why certain patterns kept showing up — this led me to astrology and then to the Akashic Records.",
        "These two things together changed everything for me. And now I use them as a bridge for others. Astrology maps your soul's blueprint through your birth chart. Your gifts, your wounds, your patterns and your path.",
        "The Akashic Records go even deeper. They're a spiritual record of your soul across time. Every experience, every contract, every lesson your soul has carried into this lifetime.",
        "Together they create a level of understanding that's hard to describe until you've experienced it.",
      ],
      signoff: "Josephine",
    },
    howItWorks: {
      sectionTag: "✦ Process",
      heading: "how it works",
      steps: [
        {
          _key: "step-1",
          title: "Choose Your Reading",
          description:
            "Browse the offerings above, select the reading that calls to you, and complete your payment securely.",
        },
        {
          _key: "step-2",
          title: "Share Your Details",
          description:
            "After payment, I'll send you everything you need — a simple form for your birth details and a personalised question menu.",
        },
        {
          _key: "step-3",
          title: "Receive Your Reading",
          description:
            "Within 7 days, you'll receive a detailed voice note recording and a supporting PDF created entirely for you.",
        },
      ],
    },
    readingsSection: {
      sectionTag: "✦ Offerings",
      heading: "readings",
      subheading:
        "Each reading is created with care, entirely for you. Nothing is templated or generic.",
    },
    testimonialsSection: {
      sectionTag: "✦ Kind Words",
      heading: "what others have said",
    },
    contactSection: {
      sectionTag: "✦ Get in Touch",
      heading: "i'd love to hear from you",
      description:
        "If you have a question before you book, or you'd simply like to say hello, please don't hesitate to reach out. I read every message personally.",
      submitText: "Send Message",
    },
  });

  // --- Booking Page ---
  transaction.createOrReplace({
    _id: "bookingPage",
    _type: "bookingPage",
    emailLabel: "Your Email Address",
    emailDisclaimer: "Your email is only used for this reading. I'll never share it.",
    paymentButtonText: "Continue to Payment",
    securityNote: "Secure checkout · Your details are safe",
    entertainmentAcknowledgment:
      "I understand that this reading is provided for entertainment purposes only. It is not a substitute for medical, psychological, legal, or financial advice. I will not rely on it as a factual prediction or guarantee of future outcomes.",
    closingMessage:
      "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
    deliveryNote: "You'll receive your voice note and PDF within 7 days of payment.",
  });

  // --- Thank You Page ---
  transaction.createOrReplace({
    _id: "thankYouPage",
    _type: "thankYouPage",
    heading: "Thank you for booking",
    subheading: "I'm really looking forward to reading for you. This is going to be special.",
    steps: [
      {
        _key: "step-1",
        icon: "mail",
        title: "Check your email",
        description:
          "I'll send you a confirmation email within the next hour with a link to your intake form.",
      },
      {
        _key: "step-2",
        icon: "fileText",
        title: "Fill in your details",
        description: "So I can create your reading, I'll need your details via the intake form.",
      },
      {
        _key: "step-3",
        icon: "clock",
        title: "Receive your reading",
        description:
          "Within 7 days of receiving your details, I'll send you a detailed voice note recording and a supporting PDF created entirely for you.",
      },
    ],
    closingMessage:
      "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
    returnButtonText: "Return to Home",
  });

  // --- Site Settings ---
  transaction.createOrReplace({
    _id: "siteSettings",
    _type: "siteSettings",
    brandName: "Josephine",
    navLinks: [
      { _key: "nav-readings", label: "Readings", sectionId: "readings" },
      { _key: "nav-about", label: "About", sectionId: "about" },
      { _key: "nav-how", label: "How It Works", sectionId: "how-it-works" },
      { _key: "nav-contact", label: "Contact", sectionId: "contact" },
    ],
    navCtaText: "Book a Reading",
    socialLinks: [
      {
        _key: "social-tiktok",
        platform: "tiktok",
        url: "https://www.tiktok.com/@withjosephine",
        label: "Follow on TikTok",
      },
    ],
    copyrightText: "Josephine. All rights reserved.",
  });

  // --- Theme ---
  const themeColor = (hex: string) => ({ _type: "color", hex, alpha: 1 });
  transaction.createOrReplace({
    _id: "theme",
    _type: "theme",
    colors: {
      bgPrimary: themeColor("#FAF8F4"),
      bgSection: themeColor("#F5F0E8"),
      bgDark: themeColor("#0D0B1A"),
      bgInteractive: themeColor("#1C1935"),
      textPrimary: themeColor("#3D3633"),
      textHeading: themeColor("#0D0B1A"),
      textMuted: themeColor("#7A6F6A"),
      textOnDark: themeColor("#FAF8F4"),
      accent: themeColor("#C4A46B"),
      accentLight: themeColor("#D4BC8B"),
      blush: themeColor("#E8D5C4"),
      rose: themeColor("#BF9B8B"),
      ivory: themeColor("#FAFAF8"),
    },
    displayFont: "Cormorant Garamond",
    bodyFont: "Inter",
  });

  console.log("Committing transaction...");
  await transaction.commit();
  console.log("Seed complete. All documents created.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
