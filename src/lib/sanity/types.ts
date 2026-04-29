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
  };
  seo?: SanitySeo;
};

export type SanityBookingPage = {
  emailLabel: string;
  emailDisclaimer: string;
  paymentButtonText: string;
  securityNote: string;
  entertainmentAcknowledgment: string;
  coolingOffAcknowledgment: string;
  formatNote: string;
  closingMessage: string;
  deliveryNote: string;
  seo?: SanitySeo;
};

export type SanityThankYouPage = {
  heading: string;
  subheading: string;
  steps: { icon: string; title: string; description: string }[];
  closingMessage: string;
  returnButtonText: string;
  seo?: SanitySeo;
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

/**
 * A Portable Text block. The shape comes from Sanity's block editor output.
 * We re-export a minimal structural type rather than pulling in the full
 * `@sanity/types` dependency tree.
 */
export type SanityPortableTextBlock = {
  _type: string;
  _key?: string;
  style?: string;
  children?: Array<{
    _type: "span";
    _key?: string;
    text: string;
    marks?: string[];
  }>;
  markDefs?: Array<{
    _type: string;
    _key: string;
    href?: string;
  }>;
  listItem?: "bullet" | "number";
  level?: number;
};

export type SanityFormFieldType =
  | "shortText"
  | "longText"
  | "email"
  | "date"
  | "time"
  | "select"
  | "multiSelectExact"
  | "fileUpload"
  | "consent"
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
};

export type SanityConsentBlock = {
  trustLine?: string;
};

export type SanityBookingForm = {
  title: string;
  intro?: string;
  description?: string;
  confirmationMessage?: string;
  nonRefundableNotice: string;
  entryPageContent?: SanityEntryPageContent;
  consentBlock?: SanityConsentBlock;
  pagination?: SanityPagination;
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
