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
  aboutJosephineLinkText: string;
  giftToggleForMeLabel: string;
  giftToggleAsGiftLabel: string;
  giftToggleHelper: string;
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
  aboutJosephineLinkText: "About Josephine",
  giftToggleForMeLabel: "For myself",
  giftToggleAsGiftLabel: "Send as a gift",
  giftToggleHelper: "",
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

export interface BookingGiftFormContent {
  heading: string;
  subheading: string;
  deliveryMethodLabel: string;
  deliveryMethodSelfSendLabel: string;
  deliveryMethodSelfSendHelper: string;
  deliveryMethodScheduledLabel: string;
  deliveryMethodScheduledHelper: string;
  purchaserFirstNameLabel: string;
  purchaserFirstNameHelper: string;
  purchaserEmailLabel: string;
  purchaserEmailHelper: string;
  recipientNameLabelSelfSend: string;
  recipientNamePlaceholderSelfSend: string;
  recipientNameLabelScheduled: string;
  recipientNameHelperScheduled: string;
  recipientEmailLabel: string;
  recipientEmailHelper: string;
  giftMessageLabel: string;
  giftMessagePlaceholder: string;
  sendAtSectionLabel: string;
  sendAtPresetNow: string;
  sendAtPresetWeek: string;
  sendAtPresetMonth: string;
  sendAtCustomLabel: string;
  consentIntro: string;
  nonRefundableNotice: string;
  submitButtonSelfSend: string;
  submitButtonScheduled: string;
  loadingStateCopy: string;
  antiAbuseCapHeading: string;
  antiAbuseCapBody: string;
  firstNameRequiredError: string;
  emailInvalidError: string;
  recipientNameRequiredError: string;
  recipientEmailRequiredError: string;
  sendAtRequiredError: string;
  consentRequiredError: string;
  verificationError: string;
  genericError: string;
  networkError: string;
  sendAtTimezoneHint: string;
}

export const BOOKING_GIFT_FORM_DEFAULTS: BookingGiftFormContent = {
  heading: "A reading, given.",
  subheading: "",
  deliveryMethodLabel: "How should it travel?",
  deliveryMethodSelfSendLabel: "I\u2019ll send the link myself",
  deliveryMethodSelfSendHelper:
    "You\u2019ll receive a private link by email. Forward it to them in your own words.",
  deliveryMethodScheduledLabel: "Schedule the email",
  deliveryMethodScheduledHelper: "We\u2019ll email them on the date you choose.",
  purchaserFirstNameLabel: "Your first name",
  purchaserFirstNameHelper: "So we can tell them who it\u2019s from.",
  purchaserEmailLabel: "Your email",
  purchaserEmailHelper: "Your receipt + a copy of the gift link will arrive here.",
  recipientNameLabelSelfSend: "Who\u2019s this for? (optional)",
  recipientNamePlaceholderSelfSend:
    "my sister, Maya, the friend who keeps mentioning her chart\u2026",
  recipientNameLabelScheduled: "Their first name",
  recipientNameHelperScheduled: "We\u2019ll address the email to them.",
  recipientEmailLabel: "Their email",
  recipientEmailHelper:
    "Used only to send the claim email at the time you choose.",
  giftMessageLabel: "A note for them (optional)",
  giftMessagePlaceholder: "A word for them, if you like\u2026",
  sendAtSectionLabel: "When should it arrive?",
  sendAtPresetNow: "Right away",
  sendAtPresetWeek: "On a chosen morning",
  sendAtPresetMonth: "At a specific moment",
  sendAtCustomLabel: "Choose the date and time",
  consentIntro: "Before this travels onward:",
  nonRefundableNotice:
    "Gifts are non-refundable once payment is complete. You can change the recipient (their name, email, or send-at date) any time before we send them the claim email.",
  submitButtonSelfSend: "Send this gift",
  submitButtonScheduled: "Prepare this gift",
  loadingStateCopy: "One moment - taking you to checkout.",
  antiAbuseCapHeading: "A gentle pause",
  antiAbuseCapBody:
    "There\u2019s already a reading waiting for this person. Give them a quiet moment to open it before sending another.",
  firstNameRequiredError: "Your first name is required.",
  emailInvalidError: "Enter a valid email address.",
  recipientNameRequiredError: "Recipient name is required.",
  recipientEmailRequiredError: "Enter a valid recipient email.",
  sendAtRequiredError: "Pick when the gift should arrive.",
  consentRequiredError: "Required to proceed.",
  verificationError: "Please complete the verification step and try again.",
  genericError: "Something went wrong. Please try again.",
  networkError: "Network problem. Please try again.",
  sendAtTimezoneHint: "This will arrive {date} in your timezone.",
};

export interface AuthGatedPageContent {
  signInHeading: string;
  signInBody: string;
  signInButtonLabel: string;
  signInFootnote: string;
  checkEmailHeading: string;
  checkEmailBody: string;
  checkEmailResendLabel: string;
}

export interface MyReadingsPageContent extends AuthGatedPageContent {
  listHeading: string;
  listSubheading: string;
  openButtonLabel: string;
  emptyHeading: string;
  emptyCtaLabel: string;
  expiredRowLabel: string;
  expiredMailtoLabel: string;
  expiredMailtoSubject: string;
  readingsTabLabel: string;
  giftsTabLabel: string;
  welcomeHeading?: string;
  welcomeSubhead?: string;
  welcomeButtonLabel?: string;
  exportHeading?: string;
  exportBody?: string;
  exportButtonLabel?: string;
  exportPendingLabel?: string;
  exportSuccessMessage?: string;
  exportErrorMessage?: string;
}

export const MY_READINGS_PAGE_DEFAULTS: MyReadingsPageContent = {
  listHeading: "Your readings",
  listSubheading: "Gathered here, ready when you are.",
  openButtonLabel: "Open your reading",
  emptyHeading: "Your readings will appear here once they’re delivered.",
  emptyCtaLabel: "Explore Readings",
  expiredRowLabel: "Rested past 90 days",
  expiredMailtoLabel: "Email for a fresh link",
  expiredMailtoSubject: "I need a fresh link to my reading",
  readingsTabLabel: "Mine",
  giftsTabLabel: "For others",
  welcomeHeading: "Welcome to your library.",
  welcomeSubhead:
    "Tap the button below to sign in and see every reading gathered in one place. This link is private to you, please do not forward.",
  welcomeButtonLabel: "Continue to your library",
  exportHeading: "Your data",
  exportBody:
    "Request a copy of everything we hold for you. We’ll email a private download link when it’s ready.",
  exportButtonLabel: "Export my data",
  exportPendingLabel: "Preparing your export…",
  exportSuccessMessage:
    "Your export is on its way. Check your email for a private download link, it expires in seven days.",
  exportErrorMessage:
    "Something went wrong preparing your export. Please try again in a few minutes.",
  signInHeading: "Welcome back",
  signInBody:
    "Tell us the email you used to book, and we’ll send a fresh link to open your reading.",
  signInButtonLabel: "Send me a link",
  signInFootnote: "Your reading is still here, exactly as it was.",
  checkEmailHeading: "Check your email",
  checkEmailBody:
    "If we have a reading on file for that email, a fresh link is on its way. It expires in twenty-four hours.",
  checkEmailResendLabel: "Send another",
};

export interface MyGiftsPageContent extends AuthGatedPageContent {
  listHeading: string;
  listSubheading: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCtaLabel: string;
  statusScheduledLabel: string;
  statusSelfSendReadyLabel: string;
  statusSentLabel: string;
  statusPreparingLabel: string;
  statusDeliveredLabel: string;
  statusCancelledLabel: string;
  editRecipientCtaLabel: string;
  flipToSelfSendCtaLabel: string;
  resendLinkCtaLabel: string;
  privacyNote: string;
  editRecipientFormTitle: string;
  editRecipientSelfSendIndicator: string;
  editRecipientFormRecipientNameLabel: string;
  editRecipientFormRecipientEmailLabel: string;
  editRecipientFormSendAtLabel: string;
  editRecipientTimezoneLabel: string;
  editRecipientTimezonePlaceholder: string;
  editRecipientTimezoneFallbackHelp: string;
  editRecipientSaveButtonLabel: string;
  editRecipientSavingLabel: string;
  editRecipientCancelButtonLabel: string;
  flipConfirmCtaLabel: string;
  flipSwitchingLabel: string;
  resendSendingLabel: string;
  resendThrottledMessage: string;
  actionGenericError: string;
  actionNetworkError: string;
  actionClosedError: string;
  editRecipientSendAtPreviewTemplate: string;
  resendRetryAfterHourTemplate: string;
  resendRetryAfterDayTemplate: string;
  resendRetryFallbackLabel: string;
  flipToScheduledCtaLabel: string;
  flipToScheduledFormTitle: string;
  flipToScheduledSaveButtonLabel: string;
  flipToScheduledSavingLabel: string;
  sendNowCtaLabel: string;
  sendNowConfirmCtaLabel: string;
  sendNowSendingLabel: string;
  sendNowSessionExpiredError: string;
}

export const MY_GIFTS_PAGE_DEFAULTS: MyGiftsPageContent = {
  listHeading: "Your gifts",
  listSubheading: "Every reading you’ve sent, gathered in one quiet place.",
  emptyHeading: "No gifts here yet.",
  emptyBody: "When you send a reading to someone, you’ll find its status here.",
  emptyCtaLabel: "Send a reading",
  signInHeading: "Welcome back",
  signInBody:
    "Tell us the email you used to send a gift, and we’ll send a fresh link to manage it.",
  signInButtonLabel: "Send me a link",
  signInFootnote: "Your gifts are still here, exactly as you left them.",
  checkEmailHeading: "Check your email",
  checkEmailBody:
    "If we have a gift on file for that email, a fresh link is on its way. It expires in twenty-four hours.",
  checkEmailResendLabel: "Send another",
  statusScheduledLabel: "Scheduled to send",
  statusSelfSendReadyLabel: "Link ready to share",
  statusSentLabel: "Sent, resting in their inbox",
  statusPreparingLabel: "In Josephine’s hands",
  statusDeliveredLabel: "Delivered",
  statusCancelledLabel: "Cancelled",
  editRecipientCtaLabel: "Edit recipient",
  flipToSelfSendCtaLabel: "Cancel the schedule and send it myself",
  resendLinkCtaLabel: "Resend the link to me",
  privacyNote:
    "We only show you status here. Your recipient’s answers, voice note, and PDF stay private to them.",
  editRecipientFormTitle: "Edit recipient",
  editRecipientSelfSendIndicator: "Self-send delivery: you share the link yourself",
  editRecipientFormRecipientNameLabel: "Recipient name",
  editRecipientFormRecipientEmailLabel: "Recipient email",
  editRecipientFormSendAtLabel: "Send at",
  editRecipientTimezoneLabel: "Time zone",
  editRecipientTimezonePlaceholder: "Pick your time zone",
  editRecipientTimezoneFallbackHelp:
    "We couldn’t detect your time zone. Pick one below so the email arrives at the right moment.",
  editRecipientSaveButtonLabel: "Save changes",
  editRecipientSavingLabel: "Saving…",
  editRecipientCancelButtonLabel: "Cancel",
  flipConfirmCtaLabel: "Tap again to confirm",
  flipSwitchingLabel: "Switching…",
  resendSendingLabel: "Sending…",
  resendThrottledMessage:
    "You’ve already resent this recently. Try again in a little while.",
  actionGenericError: "Something went wrong. Please try again.",
  actionNetworkError: "Network problem. Please try again.",
  actionClosedError: "This gift can’t be edited anymore.",
  editRecipientSendAtPreviewTemplate: "Arrives {date} ({tz}).",
  resendRetryAfterHourTemplate: "You can resend again at {when}.",
  resendRetryAfterDayTemplate: "You’ve hit today’s limit. Try again at {when}.",
  resendRetryFallbackLabel: "shortly",
  flipToScheduledCtaLabel: "Let Josephine send it for me",
  flipToScheduledFormTitle: "Have Josephine deliver the link",
  flipToScheduledSaveButtonLabel: "Schedule it",
  flipToScheduledSavingLabel: "Scheduling…",
  sendNowCtaLabel: "Send now",
  sendNowConfirmCtaLabel: "Tap again to send today",
  sendNowSendingLabel: "Sending…",
  sendNowSessionExpiredError:
    "Your session expired. Please refresh and try again.",
};

export interface GiftClaimPageContent {
  seoTitle: string;
  seoDescription: string;
  noTokenHeading: string;
  noTokenBody: string;
  alreadyClaimedHeading: string;
  alreadyClaimedBody: string;
  sessionExpiredHeading: string;
  sessionExpiredBody: string;
  alreadySubmittedHeading: string;
  alreadySubmittedBody: string;
  welcomeHeading: string;
  welcomeBody: string;
  welcomeCtaLabel: string;
}

export const GIFT_CLAIM_PAGE_DEFAULTS: GiftClaimPageContent = {
  seoTitle: "Claim your gift, with Josephine",
  seoDescription: "Open the reading someone sent you.",
  noTokenHeading: "Open from your email",
  noTokenBody:
    "Your gift link came in an email. Open it from there to claim your reading.",
  alreadyClaimedHeading: "This gift has already been opened",
  alreadyClaimedBody:
    "If you think this is a mistake, reply to the email your gift came in and we’ll help.",
  sessionExpiredHeading: "Your link rested for a moment",
  sessionExpiredBody:
    "Your claim session timed out. Open the gift link from your original email again; it's still good, and your reading is waiting.",
  alreadySubmittedHeading: "We have your answers. Thank you.",
  alreadySubmittedBody:
    "Your reading is in my hands now. If something in what you sent needs a correction, just write to me at hello@withjosephine.com and I'll take care of it.",
  welcomeHeading: "Welcome, {recipientName}.",
  welcomeBody:
    "Your reading is waiting. Tap the button below to share a few details so it can begin.",
  welcomeCtaLabel: "Continue",
};

export interface GiftIntakePageContent {
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  heading: string;
  headingWelcome: string;
  lede: string;
}

export const GIFT_INTAKE_PAGE_DEFAULTS: GiftIntakePageContent = {
  seoTitle: "Open your gift, with Josephine",
  seoDescription: "Share your details so Josephine can prepare your reading.",
  eyebrow: "✦ Opening your gift",
  heading: "A few things, before we begin.",
  headingWelcome: "Welcome, a few things before we begin.",
  lede: "Someone sent you a {readingName} reading. Share your details and Josephine will prepare your reading.",
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
  libraryButtonLabel?: string;
  dataExportHeading: string;
  dataExportBlurb: string;
  dataExportButtonLabel: string;
}

export const EMAIL_LIBRARY_BUTTON_LABEL_DEFAULT = "See all your readings";

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
  dataExportHeading: "Your data, your right",
  dataExportBlurb:
    "You can download everything we hold for this reading, your intake, consent, and payment records, whenever you like. It is your right under GDPR.",
  dataExportButtonLabel: "Request my data export",
};

export interface EmailRecipientIntakeReceivedContent {
  subject: string;
  preview: string;
  heroLine: string;
  body: EmailRichText;
  cardLabel: string;
  cardDeliveryLine: string;
}

export const EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS: EmailRecipientIntakeReceivedContent = {
  subject: "Your reading is in my hands now",
  preview: "Your answers landed safely. Here's what happens next.",
  heroLine: "Your reading is in my hands",
  body: [
    ...stringToPortableTextBlocks("Hi {recipientName},"),
    ...stringToPortableTextBlocks(
      "Thank you for sharing what you did. {purchaserFirstName} gifted you a {readingName} reading, and I have everything I need now to begin.",
    ),
    ...stringToPortableTextBlocks(
      "I'll begin your reading in the next day or two. You'll hear a short note from me when I do, just so you know it's underway. Your voice note and PDF will arrive within seven days, to this email address.",
    ),
    ...stringToPortableTextBlocks(
      "If something in what you sent needs a correction. A date, a detail, anything at all. Just reply to this email; it comes straight to me.",
    ),
  ],
  cardLabel: "Your reading",
  cardDeliveryLine: "Delivery within 7 days",
};

export interface EmailGiftPurchaseConfirmationSelfSendContent {
  subject: string;
  preview: string;
  heroLine: string;
  body: EmailRichText;
  shareButtonLabel: string;
  shareUrlHelper: EmailRichText;
  cardLabel: string;
  cardDeliveryLine: string;
  refundLine: EmailRichText;
  libraryButtonLabel?: string;
}

export const EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS: EmailGiftPurchaseConfirmationSelfSendContent = {
  subject: "Your gift is ready to share",
  preview: "Your shareable link is inside.",
  heroLine: "A reading, ready for them",
  body: [
    ...stringToPortableTextBlocks("Hi {purchaserFirstName},"),
    ...stringToPortableTextBlocks(
      "Thank you for gifting a {readingName} reading. Below is a private link you can share with {recipientName} whenever the timing feels right; folded into a card, sent in a message, however it suits you. They’ll see who it’s from when they open it.",
    ),
  ],
  shareButtonLabel: "Share the link",
  shareUrlHelper: stringToPortableTextBlocks(
    "This link is for {recipientName}. Share it the way you’d give them a handwritten card.",
  ),
  cardLabel: "The gift",
  cardDeliveryLine: "Delivery within 7 days of claim",
  refundLine: stringToPortableTextBlocks(
    "Gifts are non-refundable once payment is complete. Until {recipientName} opens their link, you can change their name, email, or send date from your library at {myGiftsUrl}.",
  ),
};

export interface EmailGiftPurchaseConfirmationScheduledContent {
  subject: string;
  preview: string;
  heroLine: string;
  body: EmailRichText;
  cardLabel: string;
  cardDeliveryLine: string;
  refundLine: EmailRichText;
  libraryButtonLabel?: string;
}

export const EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS: EmailGiftPurchaseConfirmationScheduledContent = {
  subject: "Your gift is scheduled",
  preview: "We’ll send it to {recipientName} on {sendAtDisplay}.",
  heroLine: "A reading, on its way",
  body: [
    ...stringToPortableTextBlocks("Hi {purchaserFirstName},"),
    ...stringToPortableTextBlocks(
      "Thank you for gifting a {readingName} reading. I’ll let {recipientName} know about it on {sendAtDisplay}, when they’ll receive a short note from me with a private link to claim it and share what I need to read for them.",
    ),
  ],
  cardLabel: "The gift",
  cardDeliveryLine: "Delivery within 7 days of claim",
  refundLine: stringToPortableTextBlocks(
    "Gifts are non-refundable once payment is complete. Until {recipientName} opens their link, you can change their name, email, or send date from your library at {myGiftsUrl}.",
  ),
};

export interface EmailGiftClaimContent {
  subjectFirstSend: string;
  previewFirstSend: string;
  heroLineFirstSend: string;
  body: EmailRichText;
  giftMessageLabel: string;
  claimButtonLabel: string;
  claimUrlHelper: EmailRichText;
  cardLabel: string;
  cardDeliveryLine: string;
}

export const EMAIL_GIFT_CLAIM_DEFAULTS: EmailGiftClaimContent = {
  subjectFirstSend: "A reading, waiting for you",
  previewFirstSend: "{purchaserFirstName} has sent you a reading.",
  heroLineFirstSend: "A reading, for you",
  body: [
    ...stringToPortableTextBlocks("Hi {recipientName},"),
    ...stringToPortableTextBlocks(
      "{purchaserFirstName} has given you a {readingName} reading with me. When you’re ready, tap the link below to begin. A short welcome opens first, then a form so I know what to read for you: your birth details, what you’re sitting with, anything you’d like me to keep in mind. After that, the reading lands in your inbox within seven days.",
    ),
  ],
  giftMessageLabel: "A note from {purchaserFirstName}",
  claimButtonLabel: "Open your gift",
  claimUrlHelper: stringToPortableTextBlocks(
    "This link is for you. Open it from a quiet moment; a short welcome and then a ten-minute form follow.",
  ),
  cardLabel: "The gift",
  cardDeliveryLine: "Delivered within 7 days of your intake",
};

export interface EmailGiftClaimReminderContent {
  subject: string;
  preview: string;
  heroLine: string;
  body?: EmailRichText;
  giftMessageLabel: string;
  cardLabel: string;
  cardDeliveryLine: string;
}

export const EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS: EmailGiftClaimReminderContent = {
  subject: "A reading is still waiting for you",
  preview: "A small reminder about the reading {purchaserFirstName} sent you.",
  heroLine: "Still here, when you’re ready",
  body: [
    ...stringToPortableTextBlocks("Hi {recipientName},"),
    ...stringToPortableTextBlocks(
      "I sent you a note from {purchaserFirstName} a little while ago about a {readingName} reading they wanted you to have. If you can find that earlier email, the link is inside it. If you can’t, write to hello@withjosephine.com and I’ll send you a fresh one. No rush, the reading is yours whenever you’re ready.",
    ),
  ],
  giftMessageLabel: "A note from {purchaserFirstName}",
  cardLabel: "The gift",
  cardDeliveryLine: "Delivered within 7 days of your intake",
};


export interface EmailDay7DeliveryContent {
  subjectTemplate: string;
  preview: string;
  heroLine: string;
  bodyIntro: EmailRichText;
  bodyPostButton: EmailRichText;
  openButtonLabel: string;
  libraryButtonLabel?: string;
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
      "It contains the data we hold for your {submissionCount} reading(s): intake answers, consent records, transactional records, photos, voice notes, and PDFs (where delivered).",
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

const THANK_YOU_RECIPIENT_TIMELINE_BODY =
  "I\u2019ll begin your reading within the next two days, and I\u2019ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used to claim this gift.";

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
  giftPurchaserHeading: "Thank you, {purchaserFirstName}. Your gift is on its way.",
  giftPurchaserSubheading:
    "I'll take it from here. The recipient will receive a note from me with their claim link.",
  giftPurchaserBody:
    "A confirmation is on its way to your inbox. When the gift is ready to be opened, the recipient will receive their own note with a claim link, and they\u2019ll share their intake details with me from there.",
  giftPurchaserSelfSendSubheading:
    "Your gift link is ready in the email I just sent. Share it with them whenever feels right.",
  giftPurchaserSelfSendBody:
    "A confirmation is on its way to your inbox with the share link inside. Forward it to the recipient when you're ready, and they'll claim from there.",
  giftPurchaserReadingLabel: "Your gift",
  giftPurchaserTimelineBody:
    "I\u2019ll begin the recipient\u2019s reading within the next two days of them claiming the gift, and I\u2019ll send them a short note when I do. Their voice note and PDF will arrive within {deliveryDays}, sent to the email they use to claim.",
  giftPurchaserContactBody:
    "If anything comes up with the gift (a wrong recipient email, a change of plan, anything that doesn\u2019t look right in your confirmation), just reply to that email or write to me at {email}. It comes straight to me.",
  giftRecipientHeading: "Thank you, {recipientName}. Your reading is in my hands now.",
  giftRecipientSubheading: "I've received everything I need to begin.",
  giftRecipientBody: THANK_YOU_RECIPIENT_TIMELINE_BODY,
  giftRecipientContactBody: THANK_YOU_GENERIC_CONTACT_BODY,
};
