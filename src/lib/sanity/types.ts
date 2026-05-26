import type { PortableTextBlock } from "@portabletext/types";

export type SanityReading = {
  _id: string;
  name: string;
  slug: string;
  tag: string;
  subtitle: string;
  price: number;
  priceDisplay: string;
  valueProposition: string;
  briefDescription: string;
  expandedDetails: string[];
  includes: string[];
  bookingSummary: string;
  requiresBirthChart: boolean;
  requiresAkashic: boolean;
  requiresQuestions: boolean;
  stripePaymentLink?: string;
  seo?: SanitySeo;
};

export type SanityTestimonial = {
  _id: string;
  quote: string;
  name: string;
  detail: string;
  order: number;
};

export type SanityFaqItem = {
  _id: string;
  question: string;
  answer: string;
  order: number;
};

export type SanityHero = {
  tagline: string;
  introGreeting: string;
  introBody: string;
  ctaText: string;
};

export type SanityAbout = {
  sectionTag: string;
  heading: string;
  imageUrl: string;
  paragraphs: string[];
  signoff: string;
};

export type SanityHowItWorks = {
  sectionTag: string;
  heading: string;
  steps: { title: string; description: string }[];
};

export type SanityLandingPage = {
  hero: SanityHero;
  about: SanityAbout;
  howItWorks: SanityHowItWorks;
  readingsSection: {
    sectionTag: string;
    heading: string;
    subheading: string;
  };
  testimonialsSection: {
    sectionTag: string;
    heading: string;
  };
  contactSection: {
    sectionTag: string;
    heading: string;
    description: string;
    submitText: string;
    successHeading?: string;
    successBody?: string;
    sendAnotherButtonText?: string;
  };
  seo?: SanitySeo;
};

export type SanityBookingPage = {
  paymentButtonText?: string;
  formatNote: string;
  deliveryNote: string;
  whatsIncludedHeading?: string;
  bookReadingCtaText?: string;
  seo?: SanitySeo;
};

export type SanityMyReadingsPage = {
  listHeading: string;
  listSubheading: string;
  openButtonLabel: string;
  emptyHeading: string;
  emptyCtaLabel: string;
  expiredRowLabel: string;
  expiredMailtoLabel: string;
  expiredMailtoSubject: string;
  signInHeading: string;
  signInBody: string;
  signInButtonLabel: string;
  signInFootnote: string;
  checkEmailHeading: string;
  checkEmailBody: string;
  checkEmailResendLabel: string;
  readingsTabLabel?: string;
  giftsTabLabel?: string;
  welcomeHeading?: string;
  welcomeSubhead?: string;
  welcomeButtonLabel?: string;
};

export type SanityMyGiftsPage = {
  listHeading: string;
  listSubheading: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCtaLabel: string;
  signInHeading: string;
  signInBody: string;
  signInButtonLabel: string;
  signInFootnote: string;
  checkEmailHeading: string;
  checkEmailBody: string;
  checkEmailResendLabel: string;
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
  editRecipientFormTitle?: string;
  editRecipientSelfSendIndicator?: string;
  editRecipientFormRecipientNameLabel?: string;
  editRecipientFormRecipientEmailLabel?: string;
  editRecipientFormSendAtLabel?: string;
  editRecipientTimezoneLabel?: string;
  editRecipientTimezonePlaceholder?: string;
  editRecipientTimezoneFallbackHelp?: string;
  editRecipientSaveButtonLabel?: string;
  editRecipientSavingLabel?: string;
  editRecipientCancelButtonLabel?: string;
  flipConfirmCtaLabel?: string;
  flipSwitchingLabel?: string;
  resendSendingLabel?: string;
  resendThrottledMessage?: string;
  actionGenericError?: string;
  actionNetworkError?: string;
  actionClosedError?: string;
  editRecipientSendAtPreviewTemplate?: string;
  resendRetryAfterHourTemplate?: string;
  resendRetryAfterDayTemplate?: string;
  resendRetryFallbackLabel?: string;
  flipToScheduledCtaLabel?: string;
  flipToScheduledFormTitle?: string;
  flipToScheduledSaveButtonLabel?: string;
  flipToScheduledSavingLabel?: string;
};

export type SanityGiftClaimPage = {
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
};

export type SanityGiftIntakePage = {
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  heading: string;
  headingWelcome: string;
  lede: string;
};

export type SanityMagicLinkVerifyPage = {
  confirmHeading: string;
  confirmBody: string;
  confirmEmailLabel: string;
  confirmButtonLabel: string;
  confirmFootnote: string;
  restedHeading: string;
  restedBody: string;
  restedCtaLabel: string;
};

export type SanityEmailMagicLink = {
  subject: string;
  preview: string;
  heroLine: string;
  buttonLabel: string;
  greeting?: string;
  body: PortableTextBlock[];
  signOff: string | null;
};

export type SanityEmailMagicLinkMyReadings = SanityEmailMagicLink;
export type SanityEmailMagicLinkMyGifts = SanityEmailMagicLink;

export type SanityEmailOrderConfirmation = {
  subject: string;
  preview: string;
  brandName: string;
  brandSubtitle: string;
  heroLine: string;
  body?: PortableTextBlock[];
  greeting?: string;
  thanksLine?: PortableTextBlock[];
  timelineLine?: PortableTextBlock[];
  contactLine?: PortableTextBlock[];
  cardLabel: string;
  cardDeliveryLine: string;
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
};

export type SanityEmailRecipientIntakeReceived = SanityEmailOrderConfirmation;

export type SanityEmailGiftPurchaseConfirmationSelfSend = {
  subject: string;
  preview: string;
  brandName: string;
  brandSubtitle: string;
  heroLine: string;
  body?: PortableTextBlock[];
  greeting?: string;
  detailLineSelfSend?: PortableTextBlock[];
  shareButtonLabel: string;
  shareUrlHelper: PortableTextBlock[];
  cardLabel: string;
  cardDeliveryLine: string;
  refundLine: PortableTextBlock[];
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
};

export type SanityEmailGiftPurchaseConfirmationScheduled = {
  subject: string;
  preview: string;
  brandName: string;
  brandSubtitle: string;
  heroLine: string;
  body?: PortableTextBlock[];
  greeting?: string;
  detailLineScheduled?: PortableTextBlock[];
  cardLabel: string;
  cardDeliveryLine: string;
  refundLine: PortableTextBlock[];
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
};

export type SanityEmailGiftClaim = {
  subjectFirstSend: string;
  previewFirstSend: string;
  brandName: string;
  brandSubtitle: string;
  heroLineFirstSend: string;
  body?: PortableTextBlock[];
  greeting?: string;
  bodyFirstSend?: PortableTextBlock[];
  giftMessageLabel: string;
  claimButtonLabel: string;
  claimUrlHelper: PortableTextBlock[];
  cardLabel: string;
  cardDeliveryLine: string;
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
};

export type SanityEmailGiftClaimReminder = {
  subject: string;
  preview: string;
  brandName: string;
  brandSubtitle: string;
  heroLine: string;
  body?: PortableTextBlock[];
  giftMessageLabel: string;
  cardLabel: string;
  cardDeliveryLine: string;
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
};

export type SanityEmailPrivacyExport = {
  subject: string;
  preview: string;
  heroLine: string;
  bodyIntro?: PortableTextBlock[];
  bodyPostButton?: PortableTextBlock[];
  greeting?: string;
  introLine?: PortableTextBlock[];
  contentsLine?: PortableTextBlock[];
  ctaLabel: string;
  expiryLine?: PortableTextBlock[];
  signOff: string | null;
};

export type SanityEmailDay7Delivery = {
  subjectTemplate: string;
  preview: string;
  bodyIntro?: PortableTextBlock[];
  bodyPostButton?: PortableTextBlock[];
  greeting?: string;
  lineReady?: string;
  comfortLine?: PortableTextBlock[];
  openButtonLabel: string;
  signedInDisclosure?: PortableTextBlock[];
  accessWindowLine?: PortableTextBlock[];
  comfortFollowUp?: PortableTextBlock[];
  signOff: string | null;
};

export type SanityEmailSharedShell = {
  brandName: string;
  brandSubtitle: string;
  signOffLine1: string;
  signOffLine2: string;
  footerDisclaimer: string;
};

export type SanityListenPage = {
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
  expiredHeading: string;
  expiredBody: string;
  expiredMailtoLabel: string;
  expiredMailtoSubject: string;
};

export type SanityThankYouOverride = {
  readingSlug: string;
  heading?: string;
  subheading?: string;
  confirmationBody?: string;
  timelineBody?: string;
  contactBody?: string;
  closingMessage?: string;
};

export type SanityThankYouPage = {
  heading: string;
  subheading: string;
  readingLabel?: string;
  confirmationBody?: string;
  timelineBody?: string;
  deliveryDaysPhrase?: string;
  contactBody?: string;
  closingMessage: string;
  returnButtonText: string;
  giftPurchaserHeading?: string;
  giftPurchaserSubheading?: string;
  giftPurchaserBody?: string;
  giftPurchaserSelfSendSubheading?: string;
  giftPurchaserSelfSendBody?: string;
  giftPurchaserReadingLabel?: string;
  giftPurchaserTimelineBody?: string;
  giftPurchaserContactBody?: string;
  giftRecipientHeading?: string;
  giftRecipientSubheading?: string;
  giftRecipientBody?: string;
  giftRecipientContactBody?: string;
  overrides?: SanityThankYouOverride[];
  seo?: SanitySeo;
};

export type SanityConsentBanner = {
  hideInPreview?: boolean;
  title?: string;
  body?: string;
  privacyLinkText?: string;
  acceptLabel?: string;
  declineLabel?: string;
};

export type SanitySiteSettings = {
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  navLinks: { label: string; sectionId: string }[];
  navCtaText: string;
  socialLinks: { platform: string; url: string; label: string }[];
  copyrightText: string;
  contactEmail: string;
  consentBanner?: SanityConsentBanner;
};

export type SanityColor = {
  hex: string;
  alpha?: number;
};

export type SanityThemeColors = {
  bgPrimary: SanityColor;
  bgSection: SanityColor;
  bgDark: SanityColor;
  bgInteractive: SanityColor;
  textPrimary: SanityColor;
  textHeading: SanityColor;
  textMuted: SanityColor;
  textOnDark: SanityColor;
  accent: SanityColor;
  accentLight: SanityColor;
  blush: SanityColor;
  rose: SanityColor;
  ivory: SanityColor;
};

export type SanityTheme = {
  colors: Partial<SanityThemeColors>;
  displayFont: string;
  bodyFont: string;
};

export type SanityUnderConstructionPage = {
  tag: string;
  heading: string;
  description: string;
  imageUrl?: string;
  imageAlt: string;
  contactText: string;
  seo?: SanitySeo;
};

export type SanityNotFoundPage = {
  tag: string;
  heading: string;
  description: string;
  buttonText: string;
  seo?: SanitySeo;
};

export type SanitySeo = {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: { asset: { url: string } };
};

export type SanityPortableTextBlock = PortableTextBlock;

export type SanityFormFieldType =
  | "shortText"
  | "longText"
  | "email"
  | "date"
  | "time"
  | "select"
  | "multiSelectExact"
  | "fileUpload"
  | "checkbox"
  | "placeAutocomplete";

export type SanityFormFieldNameFollowup = {
  enabled?: boolean;
  label?: string;
  placeholder?: string;
};

export type SanityFormFieldOption = {
  value: string;
  label: string;
  category?: string;
  categoryOrder?: number;
  nameFollowup?: SanityFormFieldNameFollowup;
};

export type SanityFormFieldValidation = {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternErrorMessage?: string;
};

export type SanityFormHelperPosition = "before" | "after";

export type SanityFormField = {
  _id: string;
  key: string;
  label: string;
  type: SanityFormFieldType;
  placeholder?: string;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  iconKey?: string;
  placeAutocompleteSource?: string;
  required?: boolean;
  system?: boolean;
  order?: number;
  multiSelectCount?: number;
  options?: SanityFormFieldOption[];
  validation?: SanityFormFieldValidation;
  appliesToServices?: string[];
};

export type SanityFormSection = {
  _id: string;
  sectionTitle: string;
  sectionDescription?: string;
  order?: number;
  pageBoundary?: boolean;
  marginaliaLabel?: string;
  transitionLine?: string;
  clarificationNote?: string;
  appliesToServices?: string[];
  fields: SanityFormField[];
};

export type SanityPaginationOverride = {
  readingSlug: string;
  pageCount?: number;
};

export type SanityPagination = {
  overrides?: SanityPaginationOverride[];
};

export type SanityEntryPageContent = {
  letterOpener?: string;
  letterBridge?: string;
  letterClosing?: string;
  dropCapCta?: string;
  dropCapCaption?: string;
  changeReadingLinkText?: string;
  aboutJosephineLinkText?: string;
  letterTitle?: string;
  giftToggleForMeLabel?: string;
  giftToggleAsGiftLabel?: string;
  giftToggleHelper?: string;
};

export type SanityBookingGiftForm = {
  heading?: string;
  subheading?: string;
  deliveryMethodLabel?: string;
  deliveryMethodSelfSendLabel?: string;
  deliveryMethodSelfSendHelper?: string;
  deliveryMethodScheduledLabel?: string;
  deliveryMethodScheduledHelper?: string;
  purchaserFirstNameLabel?: string;
  purchaserFirstNameHelper?: string;
  purchaserEmailLabel?: string;
  purchaserEmailHelper?: string;
  recipientNameLabelSelfSend?: string;
  recipientNamePlaceholderSelfSend?: string;
  recipientNameLabelScheduled?: string;
  recipientNameHelperScheduled?: string;
  recipientEmailLabel?: string;
  recipientEmailHelper?: string;
  giftMessageLabel?: string;
  giftMessagePlaceholder?: string;
  sendAtSectionLabel?: string;
  sendAtPresetNow?: string;
  sendAtPresetWeek?: string;
  sendAtPresetMonth?: string;
  sendAtCustomLabel?: string;
  consentIntro?: string;
  nonRefundableNotice?: string;
  submitButtonSelfSend?: string;
  submitButtonScheduled?: string;
  loadingStateCopy?: string;
  antiAbuseCapHeading?: string;
  antiAbuseCapBody?: string;
  firstNameRequiredError?: string;
  emailInvalidError?: string;
  recipientNameRequiredError?: string;
  recipientEmailRequiredError?: string;
  sendAtRequiredError?: string;
  consentRequiredError?: string;
  verificationError?: string;
  genericError?: string;
  networkError?: string;
  sendAtTimezoneHint?: string;
};

export type SanityBookingForm = {
  nonRefundableNotice: string;
  entryPageContent?: SanityEntryPageContent;
  pagination?: SanityPagination;
  loadingStateCopy?: string;
  nextButtonText?: string;
  saveAndContinueLaterText?: string;
  pageIndicatorTagline?: string;
  sections: SanityFormSection[];
};

export type SanityLegalPage = {
  _id: string;
  title: string;
  slug: string;
  tag?: string;
  lastUpdated: string;
  body: SanityPortableTextBlock[];
  seo?: Pick<SanitySeo, "metaTitle" | "metaDescription">;
};
