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
    "The intake form \u2014 about five minutes. You\u2019ll review before paying.",
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
  consentIntro: "Before this travels onward \u2014",
  nonRefundableNotice:
    "Gifts are non-refundable once payment is complete. You can change the recipient (their name, email, or send-at date) any time before we send them the claim email.",
  submitButtonSelfSend: "Send this gift",
  submitButtonScheduled: "Prepare this gift",
  loadingStateCopy: "One moment \u2014 taking you to checkout.",
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
}

export const MY_READINGS_PAGE_DEFAULTS: MyReadingsPageContent = {
  listHeading: "Your readings",
  listSubheading: "Gathered here, ready when you are.",
  openButtonLabel: "Open your reading",
  emptyHeading: "Your readings will appear here once they’re delivered.",
  emptyCtaLabel: "Explore Readings",
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
  editRecipientFormRecipientNameLabel: string;
  editRecipientFormRecipientEmailLabel: string;
  editRecipientFormSendAtLabel: string;
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
  statusSentLabel: "Sent — resting in their inbox",
  statusPreparingLabel: "In Josephine’s hands",
  statusDeliveredLabel: "Delivered",
  statusCancelledLabel: "Cancelled",
  editRecipientCtaLabel: "Edit recipient",
  flipToSelfSendCtaLabel: "Send the link myself instead",
  resendLinkCtaLabel: "Resend the link to me",
  privacyNote:
    "We only show you status here — your recipient’s answers, voice note, and PDF stay private to them.",
  editRecipientFormTitle: "Edit recipient",
  editRecipientFormRecipientNameLabel: "Recipient name",
  editRecipientFormRecipientEmailLabel: "Recipient email",
  editRecipientFormSendAtLabel: "Send at",
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
  editRecipientSendAtPreviewTemplate: "Arrives {date} in your timezone.",
  resendRetryAfterHourTemplate: "You can resend again at {when}.",
  resendRetryAfterDayTemplate: "You’ve hit today’s limit. Try again at {when}.",
  resendRetryFallbackLabel: "shortly",
};

export interface GiftClaimPageContent {
  seoTitle: string;
  seoDescription: string;
  noTokenHeading: string;
  noTokenBody: string;
  alreadyClaimedHeading: string;
  alreadyClaimedBody: string;
}

export const GIFT_CLAIM_PAGE_DEFAULTS: GiftClaimPageContent = {
  seoTitle: "Claim your gift — Josephine",
  seoDescription: "Open the reading someone sent you.",
  noTokenHeading: "Open from your email",
  noTokenBody:
    "Your gift link came in an email — open it from there to claim your reading.",
  alreadyClaimedHeading: "This gift has already been opened",
  alreadyClaimedBody:
    "If you think this is a mistake, reply to the email your gift came in and we’ll help.",
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
  seoTitle: "Open your gift — Josephine",
  seoDescription: "Share your details so Josephine can prepare your reading.",
  eyebrow: "✦ Opening your gift",
  heading: "A few things, before we begin.",
  headingWelcome: "Welcome — a few things before we begin.",
  lede: "Someone sent you a {readingName}. Share your details and Josephine will prepare your reading.",
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
  confirmBody: "Type the email you used to book — we’ll open your reading from there.",
  confirmEmailLabel: "Email",
  confirmButtonLabel: "Continue",
  confirmFootnote: "Your reading is still here, exactly as it was.",
  restedHeading: "This link has rested",
  restedBody:
    "Magic links are good for one open and twenty-four hours. Head to your reading and ask for a fresh one — it’ll arrive in a moment.",
  restedCtaLabel: "Send me a fresh link",
};

export interface EmailMagicLinkContent {
  subject: string;
  preview: string;
  greeting: string;
  body: string[];
  signOff: string | null;
}

export const EMAIL_MAGIC_LINK_DEFAULTS: EmailMagicLinkContent = {
  subject: "Open your reading",
  preview: "Open your reading",
  greeting: "Hi,",
  body: [
    "Here’s a fresh link to open your reading. It’ll sign you in for the next seven days, so you can come back to the voice note and the PDF without asking again.",
    "This link expires in twenty-four hours. If you didn’t ask for it, it’s safe to ignore — nothing happens until someone clicks.",
  ],
  signOff: null,
};

export interface EmailOrderConfirmationContent {
  subject: string;
  preview: string;
  brandName: string;
  brandSubtitle: string;
  heroLine: string;
  greeting: string;
  thanksLine: string;
  timelineLine: string;
  contactLine: string;
  cardLabel: string;
  cardDeliveryLine: string;
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
}

export const EMAIL_ORDER_CONFIRMATION_DEFAULTS: EmailOrderConfirmationContent = {
  subject: "Your reading is booked — here’s what happens next",
  preview: "Your reading is booked — here’s what happens next",
  brandName: "Josephine",
  brandSubtitle: "Soul Readings",
  heroLine: "Your reading is booked",
  greeting: "Hi {firstName},",
  thanksLine:
    "Thank you for booking a {readingName} with me. I have your intake and your payment, and you don’t need to do anything else.",
  timelineLine:
    "I’ll begin your reading in the next day or two. You’ll hear a short note from me when I do, just so you know it’s underway. Your voice note and PDF will arrive within seven days, to this email address.",
  contactLine:
    "If anything comes up before then — a question, a detail you forgot to mention, anything at all — just reply to this email. It comes straight to me.",
  cardLabel: "Your reading",
  cardDeliveryLine: "Delivery within 7 days",
  signOffLine1: "With love,",
  signOffLine2: "Josephine ✦",
  footerDisclaimer: "Readings are offered for entertainment and personal reflection.",
};

export interface EmailGiftPurchaseConfirmationContent {
  subjectSelfSend: string;
  subjectScheduled: string;
  previewSelfSend: string;
  previewScheduled: string;
  brandName: string;
  brandSubtitle: string;
  heroLineSelfSend: string;
  heroLineScheduled: string;
  greeting: string;
  detailLineSelfSend: string;
  detailLineScheduled: string;
  shareButtonLabel: string;
  shareUrlHelper: string;
  cardLabel: string;
  cardDeliveryLine: string;
  refundLine: string;
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
}

export const EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS: EmailGiftPurchaseConfirmationContent = {
  subjectSelfSend: "Your gift is ready to share",
  subjectScheduled: "Your gift is scheduled",
  previewSelfSend: "Your shareable link is inside.",
  previewScheduled: "We’ll send it to {recipientName} on {sendAtDisplay}.",
  brandName: "Josephine",
  brandSubtitle: "Soul Readings",
  heroLineSelfSend: "A reading, ready for them",
  heroLineScheduled: "A reading, on its way",
  greeting: "Hi {purchaserFirstName},",
  detailLineSelfSend:
    "Thank you for gifting a {readingName}. Below is a private link you can share with {recipientName} whenever the timing feels right — folded into a card, sent in a message, however it suits you. They’ll see who it’s from when they open it.",
  detailLineScheduled:
    "Thank you for gifting a {readingName}. I’ll let {recipientName} know about it on {sendAtDisplay} — they’ll receive a short note from me with a private link to claim it and share what I need to read for them.",
  shareButtonLabel: "Share the link",
  shareUrlHelper:
    "This link is for {recipientName}. Share it the way you’d give them a handwritten card.",
  cardLabel: "The gift",
  cardDeliveryLine: "Delivery within 7 days of claim",
  refundLine:
    "Gifts are non-refundable once payment is complete. Until {recipientName} opens their link, you can change their name, email, or send date from your gifts page at withjosephine.com/my-gifts.",
  signOffLine1: "With love,",
  signOffLine2: "Josephine ✦",
  footerDisclaimer: "Readings are offered for entertainment and personal reflection.",
};

export interface EmailGiftClaimContent {
  subjectFirstSend: string;
  subjectReminder: string;
  previewFirstSend: string;
  previewReminder: string;
  brandName: string;
  brandSubtitle: string;
  heroLineFirstSend: string;
  heroLineReminder: string;
  greeting: string;
  bodyFirstSend: string;
  bodyReminder: string;
  giftMessageLabel: string;
  claimButtonLabel: string;
  claimUrlHelper: string;
  cardLabel: string;
  cardDeliveryLine: string;
  reminderContactLine: string;
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
}

export const EMAIL_GIFT_CLAIM_DEFAULTS: EmailGiftClaimContent = {
  subjectFirstSend: "A reading, waiting for you",
  subjectReminder: "A reading is still waiting for you",
  previewFirstSend: "{purchaserFirstName} has sent you a reading.",
  previewReminder: "A small reminder about the reading {purchaserFirstName} sent you.",
  brandName: "Josephine",
  brandSubtitle: "Soul Readings",
  heroLineFirstSend: "A reading, for you",
  heroLineReminder: "Still here, when you’re ready",
  greeting: "Hi {recipientName},",
  bodyFirstSend:
    "{purchaserFirstName} has given you a {readingName} with me. When you’re ready, the link below opens a short form so I know what to read for you — your birth details, what you’re sitting with, anything you’d like me to keep in mind. After that, the reading lands in your inbox within seven days.",
  bodyReminder:
    "I sent you a note from {purchaserFirstName} a little while ago about a {readingName} they wanted you to have. If you can find that earlier email, the link is inside it. If you can’t, write to hello@withjosephine.com and I’ll send you a fresh one — no rush, the reading is yours whenever you’re ready.",
  giftMessageLabel: "A note from {purchaserFirstName}",
  claimButtonLabel: "Open your gift",
  claimUrlHelper:
    "This link is for you. Open it from a quiet moment — the form takes about ten minutes.",
  cardLabel: "The gift",
  cardDeliveryLine: "Delivered within 7 days of your intake",
  reminderContactLine:
    "If you can’t find the earlier email, write to hello@withjosephine.com and I’ll send you a fresh link.",
  signOffLine1: "With love,",
  signOffLine2: "Josephine ✦",
  footerDisclaimer: "Readings are offered for entertainment and personal reflection.",
};

export interface EmailDay2StartedContent {
  subject: string;
  preview: string;
  greeting: string;
  body: string[];
  signOff: string | null;
}

export const EMAIL_DAY2_STARTED_DEFAULTS: EmailDay2StartedContent = {
  subject: "A quick note — I’ve started your reading",
  preview: "A quick note — I’ve started your reading",
  greeting: "Hi {firstName},",
  body: [
    "Just a quick note to let you know I’ve sat down with your chart and your records this week. I always want my clients to know when the work begins, so it doesn’t feel like silence on your end.",
    "I’m not going to preview anything — your reading should arrive whole, the way it’s meant to. But I wanted you to know it’s in good hands, and that I’m taking the time it asks for.",
    "You’ll hear from me again when it’s ready, within the next five days.",
  ],
  signOff: null,
};

export interface EmailDay7DeliveryContent {
  subjectTemplate: string;
  preview: string;
  greeting: string;
  lineReady: string;
  comfortLine: string;
  openButtonLabel: string;
  signedInDisclosure: string;
  comfortFollowUp: string;
  signOff: string | null;
}

export const EMAIL_DAY7_DELIVERY_DEFAULTS: EmailDay7DeliveryContent = {
  subjectTemplate: "Your {readingName} is ready",
  preview: "A short note before you press play.",
  greeting: "Hi {firstName},",
  lineReady: "Your {readingName} is here.",
  comfortLine:
    "Open it whenever the timing feels right — it’s saved to you, not to a deadline. Headphones if you have them, somewhere quiet if you can.",
  openButtonLabel: "Open your reading",
  signedInDisclosure:
    "One small thing: opening this from the link above signs you into your reading for the next seven days, so you can come back to the voice note and the PDF without asking again. After that, just tell us your email and we’ll send you back in.",
  comfortFollowUp:
    "If anything you hear sits hard, or a question opens up after, write to me. I’d rather know than not.",
  signOff: null,
};

export interface ListenPageContent {
  welcomeRibbon: string;
  deliveredHeading: string;
  deliveredSubheading: string;
  voiceNoteLabel: string;
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
}

export const LISTEN_PAGE_DEFAULTS: ListenPageContent = {
  welcomeRibbon: "Welcome back. You’re signed in for the next seven days.",
  deliveredHeading: "Your {readingName} is ready",
  deliveredSubheading: "Best with headphones, somewhere quiet.",
  voiceNoteLabel: "Voice note",
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
    "This link’s already been opened — sometimes that’s because you clicked it on another device. No problem — we’ll send a fresh one.",
  restedCtaLabel: "Send me a fresh link",
  throttledHeading: "One moment",
  throttledBody:
    "We’ve sent a few links already. Try again in a few minutes — or write to me directly and I’ll sort it out.",
  throttledMailtoLabel: "Write to Josephine",
  throttledMailtoSubject: "Trouble opening my reading",
  assetTroubleHeading: "This page is taking a moment",
  assetTroubleBody:
    "The reading is here — sometimes the connection isn’t. Try again in a minute, or write to me and I’ll make sure it reaches you.",
  assetTroubleTryAgainLabel: "Try again",
  assetTroubleMailtoLabel: "Write to Josephine",
  assetTroubleMailtoSubject: "Trouble opening my reading",
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
