// Hardcoded singleton -> field contract for `sanity-validate.mts`.
//
// We mirror `studio/schemas/*.ts` here instead of importing those modules
// because the schemas pull in `sanity` (large, browser-tied, only declared in
// `studio/package.json`) — importing from a www-side script would cross the
// workspace boundary and bloat the runtime. The trade-off is that this file
// must be kept in lockstep when schemas change. The validation harness exists
// precisely to make that drift loud (a schema-side rename surfaces here as
// "expected field <name> missing on doc" in CI).
//
// Field-type vocabulary mirrors Sanity's:
//   "string"          → JS string
//   "text"            → JS string (Sanity stores as string; rows is editor-only)
//   "boolean"         → JS boolean
//   "number"          → JS number
//   "url"             → JS string
//   "image"           → object with `_type: "image"` (we accept any object)
//   "object"          → object
//   "reference"       → { _ref: string, _type: "reference" }
//   "array"           → JS array (any item shape)
//   "array<block>"    → JS array AND items look like Portable Text blocks
//                       (the field shape that bit us 2026-05-25 — a `string`
//                        snuck in where a Portable-Text array was expected.)
//   "array<text>"     → JS array of strings
//
// Legacy fields (`hidden: true, readOnly: true, group: "legacy"`) are NOT
// validated — they survive in the schema only as a graveyard for migrated
// data and may carry shapes that no longer match their declared type.

export type ExpectedType =
  | "string"
  | "text"
  | "boolean"
  | "number"
  | "url"
  | "image"
  | "object"
  | "reference"
  | "array"
  | "array<block>"
  | "array<text>";

export interface FieldContract {
  name: string;
  type: ExpectedType;
  /** If true, missing-or-empty is a hard failure. Defaults to soft (warning) — */
  /** most copy fields ship with `initialValue` and are functionally required, */
  /** but a missing string is less corrupting than a wrong-type string. */
  required?: boolean;
}

export interface SingletonContract {
  /** Sanity document _id (singletons use a fixed id matching `_type`). */
  id: string;
  /** Sanity document `_type`. */
  type: string;
  /** Flat list of top-level fields we assert. Nested object fields are */
  /** referenced as `parent.child` only when we care; otherwise we just */
  /** assert the parent is an object. */
  fields: FieldContract[];
}

// All singletons that are surfaced in Studio's desk and that customers see.
// Mirrors the schemas under `studio/schemas/`. When you add a new singleton
// schema, add it here too.
export const SINGLETONS: SingletonContract[] = [
  {
    id: "landingPage",
    type: "landingPage",
    fields: [
      { name: "hero", type: "object" },
      { name: "about", type: "object" },
      { name: "howItWorks", type: "object" },
      { name: "readingsSection", type: "object" },
      { name: "testimonialsSection", type: "object" },
      { name: "contactSection", type: "object" },
      { name: "seo", type: "object" },
    ],
  },
  {
    id: "bookingPage",
    type: "bookingPage",
    fields: [
      { name: "paymentButtonText", type: "string" },
      { name: "formatNote", type: "string" },
      { name: "deliveryNote", type: "string" },
      { name: "whatsIncludedHeading", type: "string" },
      { name: "bookReadingCtaText", type: "string" },
      { name: "seo", type: "object" },
    ],
  },
  {
    id: "thankYouPage",
    type: "thankYouPage",
    fields: [
      { name: "heading", type: "string" },
      { name: "subheading", type: "text" },
      { name: "readingLabel", type: "string" },
      { name: "confirmationBody", type: "text" },
      { name: "timelineBody", type: "text" },
      { name: "deliveryDaysPhrase", type: "string" },
      { name: "contactBody", type: "text" },
      { name: "closingMessage", type: "text" },
      { name: "returnButtonText", type: "string" },
      { name: "giftPurchaserHeading", type: "string" },
      { name: "giftPurchaserSubheading", type: "text" },
      { name: "giftPurchaserBody", type: "text" },
      { name: "giftPurchaserSelfSendSubheading", type: "text" },
      { name: "giftPurchaserSelfSendBody", type: "text" },
      { name: "giftPurchaserReadingLabel", type: "string" },
      { name: "giftPurchaserTimelineBody", type: "text" },
      { name: "giftPurchaserContactBody", type: "text" },
      { name: "giftRecipientHeading", type: "string" },
      { name: "giftRecipientSubheading", type: "text" },
      { name: "giftRecipientBody", type: "text" },
      { name: "giftRecipientContactBody", type: "text" },
      { name: "overrides", type: "array" },
      { name: "seo", type: "object" },
    ],
  },
  {
    id: "siteSettings",
    type: "siteSettings",
    fields: [
      { name: "brandName", type: "string", required: true },
      { name: "navLinks", type: "array" },
      { name: "navCtaText", type: "string" },
      { name: "socialLinks", type: "array" },
      { name: "copyrightText", type: "string" },
      { name: "contactEmail", type: "string" },
      { name: "consentBanner", type: "object" },
    ],
  },
  {
    id: "theme",
    type: "theme",
    fields: [
      { name: "colors", type: "object" },
      { name: "displayFont", type: "string" },
      { name: "bodyFont", type: "string" },
    ],
  },
  {
    id: "notFoundPage",
    type: "notFoundPage",
    fields: [
      { name: "tag", type: "string" },
      { name: "heading", type: "string" },
      { name: "description", type: "text" },
      { name: "buttonText", type: "string" },
      { name: "seo", type: "object" },
    ],
  },
  {
    id: "underConstructionPage",
    type: "underConstructionPage",
    fields: [
      { name: "tag", type: "string" },
      { name: "heading", type: "string" },
      { name: "description", type: "text" },
      { name: "imageAlt", type: "string" },
      { name: "contactText", type: "string" },
      { name: "seo", type: "object" },
    ],
  },
  {
    id: "listenPage",
    type: "listenPage",
    fields: [
      { name: "welcomeRibbon", type: "string" },
      { name: "recipientGreeting", type: "string" },
      { name: "deliveredHeading", type: "string" },
      { name: "deliveredSubheading", type: "string" },
      { name: "voiceNoteLabel", type: "string" },
      { name: "pdfLabel", type: "string" },
      { name: "pdfButtonLabel", type: "string" },
      { name: "closerLine1", type: "text" },
      { name: "closerLine2", type: "string" },
      { name: "signInHeading", type: "string" },
      { name: "signInBody", type: "text" },
      { name: "signInButtonLabel", type: "string" },
      { name: "signInFootnote", type: "string" },
      { name: "checkEmailHeading", type: "string" },
      { name: "checkEmailBody", type: "text" },
      { name: "checkEmailResendLabel", type: "string" },
      { name: "restedHeading", type: "string" },
      { name: "restedBody", type: "text" },
      { name: "restedCtaLabel", type: "string" },
      { name: "throttledHeading", type: "string" },
      { name: "throttledBody", type: "text" },
      { name: "throttledMailtoLabel", type: "string" },
      { name: "throttledMailtoSubject", type: "string" },
      { name: "assetTroubleHeading", type: "string" },
      { name: "assetTroubleBody", type: "text" },
      { name: "assetTroubleTryAgainLabel", type: "string" },
      { name: "assetTroubleMailtoLabel", type: "string" },
      { name: "assetTroubleMailtoSubject", type: "string" },
      { name: "expiredHeading", type: "string" },
      { name: "expiredBody", type: "text" },
      { name: "expiredMailtoLabel", type: "string" },
      { name: "expiredMailtoSubject", type: "string" },
    ],
  },
  {
    id: "myReadingsPage",
    type: "myReadingsPage",
    fields: [
      { name: "listHeading", type: "string" },
      { name: "listSubheading", type: "text" },
      { name: "openButtonLabel", type: "string" },
      { name: "emptyHeading", type: "text" },
      { name: "emptyCtaLabel", type: "string" },
      { name: "expiredRowLabel", type: "string" },
      { name: "expiredMailtoLabel", type: "string" },
      { name: "expiredMailtoSubject", type: "string" },
      { name: "signInHeading", type: "string" },
      { name: "signInBody", type: "text" },
      { name: "signInButtonLabel", type: "string" },
      { name: "signInFootnote", type: "string" },
      { name: "checkEmailHeading", type: "string" },
      { name: "checkEmailBody", type: "text" },
      { name: "checkEmailResendLabel", type: "string" },
      { name: "giftsTabLabel", type: "string" },
      { name: "readingsTabLabel", type: "string" },
      { name: "welcomeButtonLabel", type: "string" },
      { name: "welcomeHeading", type: "string" },
      { name: "welcomeSubhead", type: "string" },
    ],
  },
  {
    id: "myGiftsPage",
    type: "myGiftsPage",
    fields: [
      { name: "listHeading", type: "string" },
      { name: "listSubheading", type: "text" },
      { name: "emptyHeading", type: "string" },
      { name: "emptyBody", type: "text" },
      { name: "emptyCtaLabel", type: "string" },
      { name: "signInHeading", type: "string" },
      { name: "signInBody", type: "text" },
      { name: "signInButtonLabel", type: "string" },
      { name: "signInFootnote", type: "string" },
      { name: "checkEmailHeading", type: "string" },
      { name: "checkEmailBody", type: "text" },
      { name: "checkEmailResendLabel", type: "string" },
      { name: "statusScheduledLabel", type: "string" },
      { name: "statusSelfSendReadyLabel", type: "string" },
      { name: "statusSentLabel", type: "string" },
      { name: "statusPreparingLabel", type: "string" },
      { name: "statusDeliveredLabel", type: "string" },
      { name: "statusCancelledLabel", type: "string" },
      { name: "editRecipientCtaLabel", type: "string" },
      { name: "flipToSelfSendCtaLabel", type: "string" },
      { name: "resendLinkCtaLabel", type: "string" },
      { name: "privacyNote", type: "text" },
      { name: "editRecipientFormTitle", type: "string" },
      { name: "editRecipientSelfSendIndicator", type: "string" },
      { name: "editRecipientFormRecipientNameLabel", type: "string" },
      { name: "editRecipientFormRecipientEmailLabel", type: "string" },
      { name: "editRecipientFormSendAtLabel", type: "string" },
      { name: "editRecipientTimezoneLabel", type: "string" },
      { name: "editRecipientTimezonePlaceholder", type: "string" },
      { name: "editRecipientTimezoneFallbackHelp", type: "string" },
      { name: "editRecipientSaveButtonLabel", type: "string" },
      { name: "editRecipientSavingLabel", type: "string" },
      { name: "editRecipientCancelButtonLabel", type: "string" },
      { name: "editRecipientSendAtPreviewTemplate", type: "string" },
      { name: "flipConfirmCtaLabel", type: "string" },
      { name: "flipSwitchingLabel", type: "string" },
      { name: "flipToScheduledCtaLabel", type: "string" },
      { name: "flipToScheduledFormTitle", type: "string" },
      { name: "flipToScheduledSaveButtonLabel", type: "string" },
      { name: "flipToScheduledSavingLabel", type: "string" },
      { name: "resendSendingLabel", type: "string" },
      { name: "resendThrottledMessage", type: "string" },
      { name: "resendRetryAfterHourTemplate", type: "string" },
      { name: "resendRetryAfterDayTemplate", type: "string" },
      { name: "resendRetryFallbackLabel", type: "string" },
      { name: "sendNowCtaLabel", type: "string" },
      { name: "sendNowConfirmCtaLabel", type: "string" },
      { name: "sendNowSendingLabel", type: "string" },
      { name: "sendNowSessionExpiredError", type: "string" },
      { name: "actionGenericError", type: "string" },
      { name: "actionNetworkError", type: "string" },
      { name: "actionClosedError", type: "string" },
    ],
  },
  {
    id: "magicLinkVerifyPage",
    type: "magicLinkVerifyPage",
    fields: [
      { name: "confirmHeading", type: "string" },
      { name: "confirmBody", type: "text" },
      { name: "confirmEmailLabel", type: "string" },
      { name: "confirmButtonLabel", type: "string" },
      { name: "confirmFootnote", type: "string" },
      { name: "restedHeading", type: "string" },
      { name: "restedBody", type: "text" },
      { name: "restedCtaLabel", type: "string" },
    ],
  },
  {
    id: "giftClaimPage",
    type: "giftClaimPage",
    fields: [
      { name: "seoTitle", type: "string" },
      { name: "seoDescription", type: "text" },
      { name: "noTokenHeading", type: "string" },
      { name: "noTokenBody", type: "text" },
      { name: "alreadyClaimedHeading", type: "string" },
      { name: "alreadyClaimedBody", type: "text" },
      { name: "sessionExpiredHeading", type: "string" },
      { name: "sessionExpiredBody", type: "text" },
      { name: "alreadySubmittedHeading", type: "string" },
      { name: "alreadySubmittedBody", type: "text" },
      { name: "welcomeHeading", type: "string" },
      { name: "welcomeBody", type: "text" },
      { name: "welcomeCtaLabel", type: "string" },
    ],
  },
  {
    id: "giftIntakePage",
    type: "giftIntakePage",
    fields: [
      { name: "seoTitle", type: "string" },
      { name: "seoDescription", type: "text" },
      { name: "eyebrow", type: "string" },
      { name: "heading", type: "string" },
      { name: "headingWelcome", type: "string" },
      { name: "lede", type: "text" },
    ],
  },
  // ----- emails (post-PR-#182 PortableText conversion + PR-#183/#188 splits) -----
  {
    id: "emailMagicLink",
    type: "emailMagicLink",
    fields: [
      { name: "subject", type: "string" },
      { name: "preview", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "buttonLabel", type: "string" },
      { name: "greeting", type: "string" },
      { name: "body", type: "array<block>" },
      { name: "signOff", type: "string" },
    ],
  },
  {
    id: "emailMagicLinkLibrary",
    type: "emailMagicLinkLibrary",
    fields: [
      { name: "subject", type: "string" },
      { name: "preview", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "buttonLabel", type: "string" },
      { name: "greeting", type: "string" },
      { name: "body", type: "array<block>" },
      { name: "signOff", type: "string" },
    ],
  },
  {
    id: "emailDay7Delivery",
    type: "emailDay7Delivery",
    fields: [
      { name: "subjectTemplate", type: "string" },
      { name: "preview", type: "string" },
      { name: "brandName", type: "string" },
      { name: "brandSubtitle", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "bodyIntro", type: "array<block>" },
      { name: "openButtonLabel", type: "string" },
      { name: "bodyPostButton", type: "array<block>" },
      { name: "cardLabel", type: "string" },
      { name: "cardDeliveryLine", type: "string" },
      { name: "signOffLine1", type: "string" },
      { name: "signOffLine2", type: "string" },
      { name: "footerDisclaimer", type: "string" },
      { name: "greeting", type: "string" },
      { name: "lineReady", type: "string" },
      { name: "comfortLine", type: "array<block>" },
      { name: "signedInDisclosure", type: "array<block>" },
      { name: "accessWindowLine", type: "array<block>" },
      { name: "comfortFollowUp", type: "array<block>" },
      { name: "signOff", type: "string" },
    ],
  },
  {
    id: "emailOrderConfirmation",
    type: "emailOrderConfirmation",
    fields: [
      { name: "subject", type: "string" },
      { name: "preview", type: "string" },
      { name: "brandName", type: "string" },
      { name: "brandSubtitle", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "body", type: "array<block>" },
      { name: "cardLabel", type: "string" },
      { name: "cardDeliveryLine", type: "string" },
      { name: "signOffLine1", type: "string" },
      { name: "signOffLine2", type: "string" },
      { name: "footerDisclaimer", type: "string" },
    ],
  },
  {
    id: "emailGiftClaim",
    type: "emailGiftClaim",
    // Note: `bodyFirstSend`, `bodyReminder`, `reminderContactLine`,
    // `subjectReminder`, `previewReminder`, `heroLineReminder`, `greeting`
    // are all legacy fields (`hidden: true, readOnly: true, group: "legacy"`).
    // We do not validate them — they're a migration graveyard.
    fields: [
      { name: "subjectFirstSend", type: "string" },
      { name: "previewFirstSend", type: "string" },
      { name: "brandName", type: "string" },
      { name: "brandSubtitle", type: "string" },
      { name: "heroLineFirstSend", type: "string" },
      { name: "body", type: "array<block>" },
      { name: "giftMessageLabel", type: "string" },
      { name: "claimButtonLabel", type: "string" },
      { name: "claimUrlHelper", type: "array<block>" },
      { name: "cardLabel", type: "string" },
      { name: "cardDeliveryLine", type: "string" },
      { name: "signOffLine1", type: "string" },
      { name: "signOffLine2", type: "string" },
      { name: "footerDisclaimer", type: "string" },
    ],
  },
  {
    id: "emailGiftClaimReminder",
    type: "emailGiftClaimReminder",
    fields: [
      { name: "subject", type: "string" },
      { name: "preview", type: "string" },
      { name: "brandName", type: "string" },
      { name: "brandSubtitle", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "body", type: "array<block>" },
      { name: "giftMessageLabel", type: "string" },
      { name: "cardLabel", type: "string" },
      { name: "cardDeliveryLine", type: "string" },
      { name: "signOffLine1", type: "string" },
      { name: "signOffLine2", type: "string" },
      { name: "footerDisclaimer", type: "string" },
    ],
  },
  {
    id: "emailGiftPurchaseConfirmationScheduled",
    type: "emailGiftPurchaseConfirmationScheduled",
    fields: [
      { name: "subject", type: "string" },
      { name: "preview", type: "string" },
      { name: "brandName", type: "string" },
      { name: "brandSubtitle", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "body", type: "array<block>" },
      { name: "cardLabel", type: "string" },
      { name: "cardDeliveryLine", type: "string" },
      { name: "refundLine", type: "array<block>" },
      { name: "signOffLine1", type: "string" },
      { name: "signOffLine2", type: "string" },
      { name: "footerDisclaimer", type: "string" },
    ],
  },
  {
    id: "emailGiftPurchaseConfirmationSelfSend",
    type: "emailGiftPurchaseConfirmationSelfSend",
    fields: [
      { name: "subject", type: "string" },
      { name: "preview", type: "string" },
      { name: "brandName", type: "string" },
      { name: "brandSubtitle", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "body", type: "array<block>" },
      { name: "shareButtonLabel", type: "string" },
      { name: "shareUrlHelper", type: "array<block>" },
      { name: "cardLabel", type: "string" },
      { name: "cardDeliveryLine", type: "string" },
      { name: "refundLine", type: "array<block>" },
      { name: "signOffLine1", type: "string" },
      { name: "signOffLine2", type: "string" },
      { name: "footerDisclaimer", type: "string" },
    ],
  },
  {
    id: "emailRecipientIntakeReceived",
    type: "emailRecipientIntakeReceived",
    fields: [
      { name: "subject", type: "string" },
      { name: "preview", type: "string" },
      { name: "brandName", type: "string" },
      { name: "brandSubtitle", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "body", type: "array<block>" },
      { name: "greeting", type: "string" },
      { name: "thanksLine", type: "array<block>" },
      { name: "timelineLine", type: "array<block>" },
      { name: "contactLine", type: "array<block>" },
      { name: "cardLabel", type: "string" },
      { name: "cardDeliveryLine", type: "string" },
      { name: "signOffLine1", type: "string" },
      { name: "signOffLine2", type: "string" },
      { name: "footerDisclaimer", type: "string" },
    ],
  },
  {
    id: "emailPrivacyExport",
    type: "emailPrivacyExport",
    fields: [
      { name: "subject", type: "string" },
      { name: "preview", type: "string" },
      { name: "heroLine", type: "string" },
      { name: "bodyIntro", type: "array<block>" },
      { name: "ctaLabel", type: "string" },
      { name: "bodyPostButton", type: "array<block>" },
      { name: "greeting", type: "string" },
      { name: "introLine", type: "array<block>" },
      { name: "contentsLine", type: "array<block>" },
      { name: "expiryLine", type: "array<block>" },
      { name: "signOff", type: "string" },
    ],
  },
  {
    id: "emailSharedShell",
    type: "emailSharedShell",
    fields: [
      { name: "brandName", type: "string" },
      { name: "brandSubtitle", type: "string" },
      { name: "signOffLine1", type: "string" },
      { name: "signOffLine2", type: "string" },
      { name: "footerDisclaimer", type: "string" },
    ],
  },
];
