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

export type SanitySeo = {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: { asset: { url: string } };
};
