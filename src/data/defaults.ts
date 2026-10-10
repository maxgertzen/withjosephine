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

export interface ReadingFact {
  label: string;
  value: string;
}

export const MAX_READING_FACTS = 6;

export interface ReadingFactsLayout {
  factsPerRowPhone: number;
  factsPerRowDesktop: number;
  factsBalanceRows: boolean;
  factsListOnPhones: boolean;
}

export interface ReadingPageContent extends ReadingFactsLayout {
  eyebrow: string;
  foldRowLabel: string;
  facts: ReadingFact[];
  hideFacts: boolean;
  hideReaderPhoto: boolean;
  readerName: string;
  readerLine: string;
  includedTitle: string;
  howItWorksTitle: string;
  questionsTitle: string;
  otherReadingsTitle: string;
  switchNoticeTemplate: string;
  testimonialLabel: string;
  minutesTemplate: string;
}

export const READING_PAGE_DEFAULTS: ReadingPageContent = {
  eyebrow: "Online reading",
  foldRowLabel: "About the {reading}",
  facts: [
    { label: "Format", value: "Voice + PDF" },
    { label: "Length", value: "30-40 min" },
    { label: "Arrives", value: "7 days" },
  ],
  hideFacts: false,
  hideReaderPhoto: false,
  factsPerRowPhone: 3,
  factsPerRowDesktop: 4,
  factsBalanceRows: true,
  factsListOnPhones: false,
  readerName: "Read by Josephine",
  readerLine: "Astrologer and Akashic Records reader",
  includedTitle: "What\u2019s included",
  howItWorksTitle: "How it works",
  questionsTitle: "Questions",
  otherReadingsTitle: "Not sure this is the one?",
  switchNoticeTemplate: "Switched to {reading}. Your details are saved. Start where you left off.",
  testimonialLabel: "From a client",
  minutesTemplate: "about {minutes} minutes",
};

export interface NotesContent {
  indexTitle: string;
  indexSubtitle: string;
  indexSearchDescription: string;
  navLinkLabel: string;
  readingTimeTemplate: string;
  backLabel: string;
  authorName: string;
  authorLine: string;
  listenLabel: string;
  listenLengthTemplate: string;
  signOff: string;
  updatedTemplate: string;
  cardLeadIn: string;
  cardButton: string;
  moreNotesLabel: string;
  seeAllLabel: string;
  footerLinkLabel: string;
  faqLinkTemplate: string;
  readingPageTitle: string;
}

export const NOTES_DEFAULTS: NotesContent = {
  indexTitle: "Notes",
  indexSubtitle: "",
  indexSearchDescription: "Notes by Josephine of Josephine Soul Readings.",
  navLinkLabel: "Notes",
  readingTimeTemplate: "{minutes} minute read",
  backLabel: "Notes",
  authorName: "Written by Josephine",
  authorLine: "Josephine Soul Readings",
  listenLabel: "Listen to this note",
  listenLengthTemplate: "{minutes} min",
  signOff: "With love, Josephine",
  updatedTemplate: "Updated {date}",
  cardLeadIn: "When you’re ready.",
  cardButton: "See this reading",
  moreNotesLabel: "More notes",
  seeAllLabel: "See all notes",
  footerLinkLabel: "Notes",
  faqLinkTemplate: "Read the note: {title}",
  readingPageTitle: "Notes on this reading",
};

export interface GiftContent {
  sheetEyebrow: string;
  sheetCancelLabel: string;
  shareMessageTemplate: string;
  sheetTitleTemplate: string;
  sheetStepPay: string;
  sheetStepSend: string;
  sheetStepRecipient: string;
  buyerNameLabel: string;
  buyerNameHelp: string;
  buyerNameRequired: string;
  noteLabel: string;
  noteHelpBeforePayment: string;
  noteCounterTemplate: string;
  sheetSubmitFailed: string;
  sheetNetworkFailed: string;
  thankYouHeadingTemplate: string;
  thankYouSubheading: string;
  codeCardLabel: string;
  copyLinkLabel: string;
  linkCopiedLabel: string;
  shareLabel: string;
  codeHelpTemplate: string;
  savedNoteLabelTemplate: string;
  editNoteLabel: string;
  noteFootnote: string;
  addNoteLabel: string;
  editNoteHeading: string;
  fromLabel: string;
  saveNoteLabel: string;
  noteSavedNotice: string;
  noteLockedNotice: string;
  thankYouOpenedNotice: string;
  pendingHeadingTemplate: string;
  pendingSubheading: string;
  pendingBody: string;
  priceLine: string;
  noteCardLabelTemplate: string;
  noteCardFoot: string;
  noteCardLabelNoBuyer: string;
  noteCardNoBuyerBody: string;
  noteCardFootNoBuyer: string;
  pageLineGiftTemplate: string;
  draftRestoredNotice: string;
  codeAppliedTemplate: string;
  removeCodeLabel: string;
  giftFootTemplate: string;
  giftFootNoBuyer: string;
  openedNoticeTemplate: string;
  sendDetailsLabel: string;
  sendingDetailsOverlay: string;
  openedRaceError: string;
  alreadyOpenedHeading: string;
  alreadyOpenedBody: string;
  noLongerActiveHeading: string;
  noLongerActiveBody: string;
  notFoundHeading: string;
  notFoundBody: string;
  rateLimitedHeading: string;
  rateLimitedBody: string;
  bookYourselfTemplate: string;
  redeemHeading: string;
  redeemBody: string;
  codeFieldLabel: string;
  redeemSheetEmpty: string;
  codeChecking: string;
  redeemButtonLabel: string;
  codeNotFound: string;
  codeOtherReadingTemplate: string;
  goToReadingTemplate: string;
  codeTooManyTries: string;
  codeFieldOptionalLabel: string;
  recipientThankYouHeadingTemplate: string;
  recipientThankYouSubheading: string;
  recipientThankYouCardLabelTemplate: string;
  recipientThankYouCardLabelNoBuyer: string;
  recipientThankYouTimelineTemplate: string;
  sendOpenLabel: string;
  sendHeading: string;
  recipientNameLabel: string;
  recipientEmailLabel: string;
  recipientEmailInvalid: string;
  recipientEmailIsBuyer: string;
  sendHelpTemplate: string;
  sendHelpNoNoteTemplate: string;
  sendButtonLabel: string;
  sendingLabel: string;
  sentHeadingTemplate: string;
  sentBodyTemplate: string;
  resendLinkTemplate: string;
  resendUsedHeading: string;
  resendUsedBody: string;
  sendPageHeadingTemplate: string;
  alreadySentHeading: string;
  alreadySentBodyTemplate: string;
  sendPageOpenedHeadingTemplate: string;
  sendPageOpenedBody: string;
  sendLinkInvalidHeading: string;
  sendLinkInvalidBody: string;
  sendFailedNotice: string;
  giftRowLabel: string;
  buyLead: string;
  buyLinkLabel: string;
  redeemLead: string;
  redeemLinkLabel: string;
}

export const GIFT_DEFAULTS: GiftContent = {
  sheetEyebrow: "A reading, given.",
  sheetCancelLabel: "Not now",
  shareMessageTemplate: "A reading for you, from {buyerName} ✨",
  sheetTitleTemplate: "{reading} · {price}",
  sheetStepPay: "You pay now and get a gift code and a link.",
  sheetStepSend: "Send it your way, or have Josephine email it.",
  sheetStepRecipient: "They fill in their own details when they’re ready.",
  buyerNameLabel: "Your first name",
  buyerNameHelp: "So they know who it’s from.",
  buyerNameRequired: "Your first name is required.",
  noteLabel: "A note for them (optional)",
  noteHelpBeforePayment: "You can add or change it after paying.",
  noteCounterTemplate: "{remaining} left",
  sheetSubmitFailed: "Something went wrong submitting your form. Please try again.",
  sheetNetworkFailed: "Network error. Please check your connection and try again.",
  thankYouHeadingTemplate: "Thank you, {buyerName}. Your gift is ready.",
  thankYouSubheading: "Send it whenever the timing feels right.",
  codeCardLabel: "Their gift code",
  copyLinkLabel: "Copy link",
  linkCopiedLabel: "Link copied ✓",
  shareLabel: "Share",
  codeHelpTemplate: "For the {reading}. It does not expire.",
  savedNoteLabelTemplate: "Your note, from {buyerName}",
  editNoteLabel: "Edit note",
  noteFootnote: "They see it when they open the gift. You can change it until then.",
  addNoteLabel: "Add a note",
  editNoteHeading: "Your note",
  fromLabel: "From",
  saveNoteLabel: "Save note",
  noteSavedNotice: "Your note is saved. They see it when they open the gift.",
  noteLockedNotice: "This gift has been opened, so the note can’t be changed now.",
  thankYouOpenedNotice: "The gift has been opened. There’s nothing more to send.",
  pendingHeadingTemplate: "Thank you, {buyerName}.",
  pendingSubheading: "Your gift is almost ready.",
  pendingBody:
    "Your bank is still confirming the payment. The code comes by email as soon as it clears.",
  priceLine: "A gift, already paid",
  noteCardLabelTemplate: "A note from {buyerName}",
  noteCardFoot: "This reading is already paid for.",
  noteCardLabelNoBuyer: "A reading, given",
  noteCardNoBuyerBody: "Someone sent you this reading.",
  noteCardFootNoBuyer: "It’s already paid for.",
  pageLineGiftTemplate: "a gift from {buyerName}",
  draftRestoredNotice: "Welcome back. Your answers are saved.",
  codeAppliedTemplate: "Gift code {code} applied",
  removeCodeLabel: "Remove",
  giftFootTemplate: "Nothing to pay. This reading is a gift from {buyerName}.",
  giftFootNoBuyer: "Nothing to pay. This reading is a gift.",
  openedNoticeTemplate:
    "When you send your details, {buyerName} gets a short email saying you opened the gift. It says nothing about your answers.",
  sendDetailsLabel: "Send my details →",
  sendingDetailsOverlay: "One moment, sending your details.",
  openedRaceError:
    "This gift was opened a moment ago, maybe on another device. Your answers are saved. Write to hello@withjosephine.com, or book it yourself.",
  alreadyOpenedHeading: "This gift was already opened",
  alreadyOpenedBody:
    "If you think this is a mistake, reply to the email your gift came in, or write to hello@withjosephine.com.",
  noLongerActiveHeading: "This gift is no longer active",
  noLongerActiveBody: "Write to hello@withjosephine.com and Josephine will help.",
  notFoundHeading: "We couldn’t find this gift",
  notFoundBody: "Check the code in your message, or write to hello@withjosephine.com.",
  rateLimitedHeading: "One moment",
  rateLimitedBody: "Too many tries. Wait a few minutes, then open the link again.",
  bookYourselfTemplate: "Book the {reading} yourself",
  redeemHeading: "Have a gift code?",
  redeemBody: "Enter the code from your message or email.",
  codeFieldLabel: "Gift code",
  redeemSheetEmpty: "Enter your gift code.",
  codeChecking: "Checking…",
  redeemButtonLabel: "Redeem gift",
  codeNotFound: "We couldn’t find this code. Check it and try again.",
  codeOtherReadingTemplate: "This code is for the {reading}.",
  goToReadingTemplate: "Go to the {reading}",
  codeTooManyTries: "Too many tries. Wait a few minutes.",
  codeFieldOptionalLabel: "Gift code (optional)",
  recipientThankYouHeadingTemplate: "Thank you, {recipientName}. Your reading is in my hands now.",
  recipientThankYouSubheading: "I’ve received everything I need to begin.",
  recipientThankYouCardLabelTemplate: "Your gift, from {buyerName}",
  recipientThankYouCardLabelNoBuyer: "Your gift",
  recipientThankYouTimelineTemplate:
    "I’ll begin your reading within the next two days, and I’ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you gave me.",
  sendOpenLabel: "Send it by email from Josephine",
  sendHeading: "Send it from Josephine",
  recipientNameLabel: "Their name",
  recipientEmailLabel: "Their email",
  recipientEmailInvalid: "Enter a valid recipient email.",
  recipientEmailIsBuyer: "The recipient must be someone other than you.",
  sendHelpTemplate: "From {buyerName}, with your note. Sent now, from hello@withjosephine.com.",
  sendHelpNoNoteTemplate: "From {buyerName}. Sent now, from hello@withjosephine.com.",
  sendButtonLabel: "Send now",
  sendingLabel: "Sending…",
  sentHeadingTemplate: "Sent to {recipientName}",
  sentBodyTemplate: "{recipientEmail} · just now.",
  resendLinkTemplate: "Wrong address? Fix it and send again ({count} left)",
  resendUsedHeading: "Sent twice already",
  resendUsedBody:
    "If something isn’t right, write to hello@withjosephine.com and Josephine will sort it out.",
  sendPageHeadingTemplate: "Send {recipientName}’s gift",
  alreadySentHeading: "Already sent",
  alreadySentBodyTemplate: "Sent to {recipientName} on {date}.",
  sendPageOpenedHeadingTemplate: "The gift has been opened",
  sendPageOpenedBody: "The reading is with Josephine now. There’s nothing more to send.",
  sendLinkInvalidHeading: "This link doesn’t work any more",
  sendLinkInvalidBody: "Write to hello@withjosephine.com and Josephine will help.",
  sendFailedNotice: "The email didn’t send. Try again.",
  giftRowLabel: "Giving or redeeming a gift",
  buyLead: "Buying it for someone?",
  buyLinkLabel: "Send it as a gift",
  redeemLead: "Have a code?",
  redeemLinkLabel: "Redeem gift",
};

export const NOTES_INDEX_ILLUSTRATION_URL = "/images/notes-illustration.svg";

export const INTAKE_TITLE_FALLBACK = "A few things, before we begin.";

export const PAYMENT_BUTTON_TEXT_FALLBACK = "Continue to payment →";

export const DATE_PLACEHOLDER_FALLBACK = "DD/MM/YYYY";

const INTAKE_OPENER =
  "Before I read for you, I want to know a little about you. A few details, a few questions you\u2019d like held.";

export const INTAKE_INTRO_BY_SLUG: Record<string, string[]> = {
  "soul-blueprint": [
    INTAKE_OPENER,
    "Take your time. The more honestly you write, the more your reading can hold.",
  ],
  "birth-chart": [INTAKE_OPENER, "For a Birth Chart, I only need the moment you arrived here."],
  "akashic-record": [
    INTAKE_OPENER,
    "For the records, I\u2019ll need your name, your photo, and three questions.",
  ],
};

export const INTAKE_INTRO_FALLBACK = [
  INTAKE_OPENER,
  "Take your time. There\u2019s no wrong answer.",
];

export interface ReadingCardLabels {
  learnMoreLabel: string;
  showLessLabel: string;
  bookButtonText: string;
}

export const READING_CARD_LABEL_KEYS = ["learnMoreLabel", "showLessLabel", "bookButtonText"] as const;

export interface ReadingsSectionContent extends ReadingCardLabels {
  sectionTag: string;
  heading: string;
  subheading: string;
}

export const READINGS_SECTION_DEFAULTS: ReadingsSectionContent = {
  sectionTag: "\u2726 Offerings",
  heading: "readings",
  subheading: "Each reading is created with care, entirely for you. Nothing is templated or generic.",
  learnMoreLabel: "Learn More \u2193",
  showLessLabel: "Show Less \u2191",
  bookButtonText: "Book This Reading",
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

export interface EmailReadingDeliveryContent {
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

export const EMAIL_READING_DELIVERY_DEFAULTS: EmailReadingDeliveryContent = {
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
    ...stringToPortableTextBlocks("This link is just for you; please do not share it."),
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

export interface EmailGiftPurchaseContent {
  subject: string;
  preview: string;
  heroLine: string;
  body: EmailRichText;
  noteLine: string;
  cardLabel: string;
  cardLineTemplate: string;
  shareButtonLabel: string;
  sendButtonLabel: string;
  bodyPostButton: EmailRichText;
}

export const EMAIL_GIFT_PURCHASE_DEFAULTS: EmailGiftPurchaseContent = {
  subject: "Your gift is ready to send",
  preview: "The code and link are inside.",
  heroLine: "A reading, ready for them",
  body: [
    ...stringToPortableTextBlocks("Hi {firstName},"),
    ...stringToPortableTextBlocks(
      "Thank you for gifting a {readingName}. Below is the code and a link you can send whenever the timing feels right.",
    ),
  ],
  noteLine: "They’ll see your note when they open it.",
  cardLabel: "The gift",
  cardLineTemplate: "For the {readingName} · does not expire",
  shareButtonLabel: "Share on WhatsApp",
  sendButtonLabel: "Send it by email from Josephine",
  bodyPostButton: [
    ...stringToPortableTextBlocks("Gifts are non-refundable once payment is complete."),
    ...stringToPortableTextBlocks(
      "If anything comes up with the gift, just reply to this email. It comes straight to me.",
    ),
  ],
};

export interface EmailGiftOpenedContent {
  subjectTemplate: string;
  preview: string;
  heroLine: string;
  body: EmailRichText;
}

export const EMAIL_GIFT_OPENED_DEFAULTS: EmailGiftOpenedContent = {
  subjectTemplate: "{recipientName} opened your gift",
  preview: "Their reading is with me now.",
  heroLine: "Your gift was opened",
  body: [
    ...stringToPortableTextBlocks("Hi {firstName},"),
    ...stringToPortableTextBlocks(
      "{recipientName} opened the {readingName} you gave them and shared what I need. I’ll have it with them within seven days.",
    ),
  ],
};

export interface EmailGiftRecipientConfirmationContent {
  subject: string;
  preview: string;
  heroLine: string;
  body: EmailRichText;
  buyerNameFallback: string;
  cardLabel: string;
  cardDeliveryLine: string;
  dataExportHeading: string;
  dataExportButtonLabel: string;
}

export const EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS: EmailGiftRecipientConfirmationContent = {
  subject: "Your reading is in my hands now",
  preview: "Your answers landed safely. Here’s what happens next.",
  heroLine: "Your reading is in my hands",
  body: [
    ...stringToPortableTextBlocks("Hi {firstName},"),
    ...stringToPortableTextBlocks(
      "Thank you for sharing what you did. {buyerName} gifted you a {readingName}, and I have everything I need now to begin.",
    ),
    ...stringToPortableTextBlocks(
      "I’ll begin your reading in the next day or two. Your voice note and PDF will arrive within seven days, to this email address.",
    ),
  ],
  buyerNameFallback: "Someone",
  cardLabel: "Your reading",
  cardDeliveryLine: "Delivery within 7 days",
  dataExportHeading: "Need a copy of your data?",
  dataExportButtonLabel: "Request an export",
};

export interface EmailGiftToRecipientContent {
  subject: string;
  previewTemplate: string;
  heroLine: string;
  body: EmailRichText;
  noteLabelTemplate: string;
  openButtonLabel: string;
  codeFallbackTemplate: string;
  cardLabel: string;
  cardDeliveryLine: string;
  privacyLineTemplate: string;
}

export const EMAIL_GIFT_TO_RECIPIENT_DEFAULTS: EmailGiftToRecipientContent = {
  subject: "A reading, waiting for you",
  previewTemplate: "{buyerName} has sent you a reading.",
  heroLine: "A reading, for you",
  body: [
    ...stringToPortableTextBlocks("Hi {firstName},"),
    ...stringToPortableTextBlocks(
      "{buyerName} has given you a {readingName} with me. When you’re ready, tap below. A short form follows, so I know what to read for you, and the reading lands in your inbox within seven days.",
    ),
  ],
  noteLabelTemplate: "A note from {buyerName}",
  openButtonLabel: "Open your gift",
  codeFallbackTemplate: "The code is {code}, if the button doesn’t work.",
  cardLabel: "The gift",
  cardDeliveryLine: "Delivered within 7 days of your intake",
  privacyLineTemplate:
    "{buyerName} gave me your name and email address to send you this gift. Your email address is used for this email only and deleted once it is sent.",
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
  imageUrl: "/images/josephine-portrait.webp",
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
