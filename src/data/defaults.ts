import type { PortableTextBlock } from "@portabletext/types";

import { stringToPortableTextBlocks } from "@/lib/emails/portableTextBuild";
import type {
  SanityNotFoundPage,
  SanityThankYouPage,
  SanityUnderConstructionPage,
} from "@/lib/sanity/types";

export type EmailRichText = PortableTextBlock[];

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
  logoUrl?: string | null;
  copyrightText: string;
}

export const FOOTER_DEFAULTS: FooterContent = {
  brandName: "Josephine",
  logoUrl: "/images/logo-main.webp",
  copyrightText: "Josephine. All rights reserved.",
};

export interface ContactFormContent {
  sectionTag: string;
  heading: string;
  description: string;
  submitText: string;
  successHeading?: string;
  successBody?: string;
  sendAnotherButtonText?: string;
}

export const CONTACT_DEFAULTS: ContactFormContent = {
  sectionTag: "\u2726 Get in Touch",
  heading: "i\u2019d love to hear from you",
  description:
    "If you have a question before you book, or you\u2019d simply like to say hello, please don\u2019t hesitate to reach out. I read every message personally.",
  submitText: "Send Message",
  successHeading: "message sent",
  successBody: "Thank you for reaching out. I\u2019ll get back to you as soon as I can.",
  sendAnotherButtonText: "Send another message",
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
        "After payment, I\u2019ll send you everything you need: a simple form for your birth details and a personalised question menu.",
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
}

export const ENTRY_PAGE_DEFAULTS: EntryPageContent = {
  letterOpener:
    "Before I read for you, I want to know a little about you. A few details, a few questions you\u2019d like held.",
  letterBridge: "Take your time with this. There\u2019s no wrong answer.",
  letterClosing:
    "I can\u2019t wait to connect with you through your reading.\nWith love, Josephine \u2726",
  dropCapCta: "Tell me about you \u2192",
  dropCapCaption:
    "The intake form: about five minutes. You\u2019ll review before paying.",
  changeReadingLinkText: "Reading a different one? See all three \u2192",
};

export interface BookingInfoNotes {
  deliveryNote: string;
  deliverableNote: string;
  whatsIncludedHeading: string;
  bookReadingCtaText: string;
}

export const BOOKING_INFO_DEFAULTS: BookingInfoNotes = {
  deliveryNote: "Arrives within 7 days of payment.",
  deliverableNote:
    "A voice note plus a written PDF, made just for you.",
  whatsIncludedHeading: "What\u2019s included",
  bookReadingCtaText: "Book this Reading \u2192",
};

export interface MagicLinkVerifyPageContent {
  confirmHeading: string;
  confirmBody: string;
  confirmEmailLabel: string;
  confirmButtonLabel: string;
  confirmFootnote: string;
  restedHeading: string;
  restedBody: string;
  restedCtaLabel: string;
}

export const MAGIC_LINK_VERIFY_PAGE_DEFAULTS: MagicLinkVerifyPageContent = {
  confirmHeading: "Confirm your email",
  confirmBody: "Type the email you used to book, and we’ll open your reading from there.",
  confirmEmailLabel: "Email",
  confirmButtonLabel: "Continue",
  confirmFootnote: "Your reading is still here, exactly as it was.",
  restedHeading: "This link has rested",
  restedBody:
    "Magic links are good for one open and twenty-four hours. Head to your reading and ask for a fresh one; it’ll arrive in a moment.",
  restedCtaLabel: "Send me a fresh link",
};

export const NOT_FOUND_PAGE_DEFAULTS: SanityNotFoundPage = {
  tag: "✦ Lost in the Stars",
  heading: "This page doesn’t exist",
  description: "The path you followed leads nowhere, but the way home is always clear.",
  buttonText: "Return Home",
};

export const UNDER_CONSTRUCTION_PAGE_DEFAULTS: SanityUnderConstructionPage = {
  tag: "✦ Something Beautiful is Coming",
  heading: "Josephine",
  description: "Coming soon: a space for soul readings, birth charts, and Akashic records.",
  imageAlt: "Mystical gathering around a pyramid of light",
  contactText: "In the meantime, reach out at",
};

export interface EmailMagicLinkContent {
  subject: string;
  preview: string;
  heroLine: string;
  body: EmailRichText;
  buttonLabel: string;
  signOff: string | null;
}

export const EMAIL_MAGIC_LINK_DEFAULTS: EmailMagicLinkContent = {
  subject: "Open your reading",
  preview: "Open your reading",
  heroLine: "Open your reading",
  buttonLabel: "Open your reading",
  body: [
    ...stringToPortableTextBlocks(
      "Here’s a fresh link to open your reading. It’ll sign you in for the next seven days, so you can come back to the voice note and the PDF without asking again.",
    ),
    ...stringToPortableTextBlocks(
      "This link expires in twenty-four hours. If you didn’t ask for it, it’s safe to ignore. Nothing happens until someone clicks.",
    ),
  ],
  signOff: null,
};

// Brand + footer fields shared across every customer-facing email template.
// Sourced from the `emailSharedShell` Sanity singleton at render time; this
// constant is the fallback when the GROQ fetch returns null.
export interface EmailSharedShellContent {
  brandName: string;
  brandSubtitle: string;
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
}

export const EMAIL_SHARED_SHELL_DEFAULTS: EmailSharedShellContent = {
  brandName: "Josephine",
  brandSubtitle: "Soul Readings",
  signOffLine1: "With love,",
  signOffLine2: "Josephine ✦",
  footerDisclaimer: "Readings are offered for entertainment and personal reflection.",
};

export interface EmailOrderConfirmationContent {
  subject: string;
  preview: string;
  heroLine: string;
  body: EmailRichText;
  cardLabel: string;
  cardDeliveryLine: string;
  dataExportHeading: string;
  dataExportBlurb: string;
  dataExportButtonLabel: string;
}

export const EMAIL_ORDER_CONFIRMATION_DEFAULTS: EmailOrderConfirmationContent = {
  subject: "Your reading is booked: what happens next",
  preview: "Your reading is booked: what happens next",
  heroLine: "Your reading is booked",
  body: [
    ...stringToPortableTextBlocks("Hi {firstName},"),
    ...stringToPortableTextBlocks(
      "Thank you for booking a {readingName} reading with me. I have your intake and your payment, and you don’t need to do anything else.",
    ),
    ...stringToPortableTextBlocks(
      "I’ll begin your reading in the next day or two. You’ll hear a short note from me when I do, just so you know it’s underway. Your voice note and PDF will arrive within seven days, to this email address.",
    ),
    ...stringToPortableTextBlocks(
      "If anything comes up before then. A question, a detail you forgot to mention, anything at all. Just reply to this email; it comes straight to me.",
    ),
  ],
  cardLabel: "Your reading",
  cardDeliveryLine: "Delivery within 7 days",
  dataExportHeading: "Need a copy of your data?",
  dataExportBlurb:
    "You can download everything we hold for this reading, your intake, consent, and payment records, whenever you like. It is your right under GDPR.",
  dataExportButtonLabel: "Request an export",
};

export interface EmailDay7DeliveryContent {
  subjectTemplate: string;
  preview: string;
  heroLine: string;
  bodyIntro: EmailRichText;
  bodyPostButton: EmailRichText;
  openButtonLabel: string;
  cardLabel: string;
  cardDeliveryLine: string;
  signOff: string | null;
}

export interface EmailPrivacyExportContent {
  subject: string;
  preview: string;
  heroLine: string;
  bodyIntro: EmailRichText;
  bodyPostButton: EmailRichText;
  ctaLabel: string;
  signOff: string | null;
}

export const EMAIL_PRIVACY_EXPORT_DEFAULTS: EmailPrivacyExportContent = {
  subject: "Your Josephine data export",
  preview: "Your Josephine data export is ready",
  heroLine: "Your data export is ready",
  bodyIntro: [
    ...stringToPortableTextBlocks("Hi,"),
    ...stringToPortableTextBlocks("Your Josephine data export is ready."),
    ...stringToPortableTextBlocks(
      "It contains the data we hold for your reading: intake answers, consent records, transactional records, photos, voice notes, and PDFs (where delivered).",
    ),
  ],
  bodyPostButton: stringToPortableTextBlocks(
    "This link expires in {expiryDays} days. If you have any questions, reply to this email or write to hello@withjosephine.com.",
  ),
  ctaLabel: "Download your export (ZIP)",
  signOff: null,
};

export const EMAIL_DAY7_DELIVERY_DEFAULTS: EmailDay7DeliveryContent = {
  subjectTemplate: "Your {readingName} reading is ready",
  preview: "A short note before you press play.",
  heroLine: "Your reading is ready",
  bodyIntro: [
    ...stringToPortableTextBlocks("Hi {firstName},"),
    ...stringToPortableTextBlocks("Your {readingName} reading is here."),
    ...stringToPortableTextBlocks(
      "Open it whenever the timing feels right. It is saved to you, not to a deadline. Headphones if you have them, somewhere quiet if you can.",
    ),
  ],
  bodyPostButton: [
    ...stringToPortableTextBlocks(
      "Tap below to open your reading. You will be signed in for the next seven days, so you can come back to the voice note and the PDF without asking again.",
    ),
    ...stringToPortableTextBlocks(
      "This link is just for you; please do not share it.",
    ),
    ...stringToPortableTextBlocks(
      "Your reading stays here for the next ninety days. If a link expires sooner, just email me and I will send you a fresh one.",
    ),
    ...stringToPortableTextBlocks(
      "If anything you hear sits hard, or a question opens up after, write to me. I would rather know than not.",
    ),
  ],
  openButtonLabel: "Open your reading",
  cardLabel: "Your reading",
  cardDeliveryLine: "Voice note + PDF",
  signOff: null,
};

export interface ListenPageContent {
  welcomeRibbon: string;
  recipientGreeting: string;
  deliveredHeading: string;
  deliveredSubheading: string;
  voiceNoteLabel: string;
  voiceNoteButtonLabel: string;
  pdfLabel: string;
  pdfButtonLabel: string;
  closerLine1: string;
  closerLine2: string;
  signInHeading: string;
  signInBody: string;
  signInButtonLabel: string;
  signInFootnote: string;
  checkEmailHeading: string;
  checkEmailBody: string;
  checkEmailResendLabel: string;
  restedHeading: string;
  restedBody: string;
  restedCtaLabel: string;
  throttledHeading: string;
  throttledBody: string;
  throttledMailtoLabel: string;
  throttledMailtoSubject: string;
  assetTroubleHeading: string;
  assetTroubleBody: string;
  assetTroubleTryAgainLabel: string;
  assetTroubleMailtoLabel: string;
  assetTroubleMailtoSubject: string;
  expiredHeading: string;
  expiredBody: string;
  expiredMailtoLabel: string;
  expiredMailtoSubject: string;
}

export interface ListenInterstitialContent {
  heading: string;
  subhead: string;
  buttonLabel: string;
}

export const LISTEN_INTERSTITIAL_DEFAULTS: ListenInterstitialContent = {
  heading: "Welcome, your reading is here.",
  subhead:
    "Tap the button below to open your reading. This link is private to you, please do not forward.",
  buttonLabel: "Continue to your reading",
};

export const LISTEN_PAGE_DEFAULTS: ListenPageContent = {
  welcomeRibbon: "Welcome back. You’re signed in for the next seven days.",
  recipientGreeting: "A reading made for you, {recipientName}.",
  deliveredHeading: "Your {readingName} is ready",
  deliveredSubheading: "Best with headphones, somewhere quiet.",
  voiceNoteLabel: "Voice note",
  voiceNoteButtonLabel: "Download voice note",
  pdfLabel: "Supporting PDF",
  pdfButtonLabel: "Download PDF",
  closerLine1:
    "If anything you hear sits hard, or if a question opens up after, please write to me. I’d rather know than not.",
  closerLine2: "With love, Josephine ✦",
  signInHeading: "Welcome back",
  signInBody:
    "Tell us the email you used to book, and we’ll send a fresh link to open your reading.",
  signInButtonLabel: "Send me a link",
  signInFootnote: "Your reading is still here, exactly as it was.",
  checkEmailHeading: "Check your email",
  checkEmailBody:
    "If we have a reading on file for that email, a fresh link is on its way. It expires in twenty-four hours.",
  checkEmailResendLabel: "Send another",
  restedHeading: "This link has rested",
  restedBody:
    "This link’s already been opened. Sometimes that’s because you clicked it on another device. No problem; we’ll send a fresh one.",
  restedCtaLabel: "Send me a fresh link",
  throttledHeading: "One moment",
  throttledBody:
    "We’ve sent a few links already. Try again in a few minutes, or write to me directly and I’ll sort it out.",
  throttledMailtoLabel: "Write to Josephine",
  throttledMailtoSubject: "Trouble opening my reading",
  assetTroubleHeading: "This page is taking a moment",
  assetTroubleBody:
    "The reading is here; sometimes the connection isn’t. Try again in a minute, or write to me and I’ll make sure it reaches you.",
  assetTroubleTryAgainLabel: "Try again",
  assetTroubleMailtoLabel: "Write to Josephine",
  assetTroubleMailtoSubject: "Trouble opening my reading",
  expiredHeading: "This reading has rested",
  expiredBody:
    "Your reading rested ninety days after delivery. Write to me and I will send a fresh link in a moment, no rush.",
  expiredMailtoLabel: "Email Josephine for a fresh link",
  expiredMailtoSubject: "I need a fresh link to my reading",
};

export const ABOUT_DEFAULTS: MappedAbout = {
  sectionTag: "\u2726 About",
  heading: "who i am + what this is",
  imageUrl: "/images/akasha.webp",
  paragraphs: [
    "I found this work through my own search for purpose. Wanting to understand myself more deeply, why I was the way I was, what I was here for, why certain patterns kept showing up - this led me to astrology and then to the Akashic Records.",
    "These two things together changed everything for me. And now I use them as a bridge for others. Astrology maps your soul\u2019s blueprint through your birth chart. Your gifts, your wounds, your patterns and your path.",
    "The Akashic Records go even deeper. They\u2019re a spiritual record of your soul across time. Every experience, every contract, every lesson your soul has carried into this lifetime.",
    "Together they create a level of understanding that\u2019s hard to describe until you\u2019ve experienced it.",
  ],
  signoff: "Josephine",
};

export type ThankYouPageContent = Required<Omit<SanityThankYouPage, "overrides" | "seo">>;

const THANK_YOU_GENERIC_CONTACT_BODY =
  "If anything comes up (a question, a detail you forgot to mention, or anything that doesn\u2019t look right in your confirmation), just reply to that email or write to me at {email}. It comes straight to me.";

export const THANK_YOU_PAGE_DEFAULTS: ThankYouPageContent = {
  heading: "Thank you. I\u2019ve got everything I need.",
  subheading: "Your reading is in my hands now.",
  readingLabel: "Your Reading",
  confirmationBody:
    "A confirmation email is on its way to your inbox in the next minute or two. If you can\u2019t find it, please check your promotions folder.",
  timelineBody:
    "I\u2019ll begin your reading within the next two days, and I\u2019ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used at checkout.",
  deliveryDaysPhrase: "seven days",
  contactBody: THANK_YOU_GENERIC_CONTACT_BODY,
  closingMessage: "With love, Josephine \u2726",
  returnButtonText: "Return to Home",
};
