import { groq } from "next-sanity";

export const landingPageQuery = groq`
  *[_type == "landingPage"][0] {
    hero,
    about {
      sectionTag,
      heading,
      "imageUrl": image.asset->url,
      paragraphs,
      signoff
    },
    howItWorks,
    readingsSection,
    testimonialsSection,
    contactSection,
    seo
  }
`;

export const readingsQuery = groq`
  *[_type == "reading"] | order(order asc) {
    _id,
    name,
    "slug": slug.current,
    tag,
    subtitle,
    price,
    priceDisplay,
    valueProposition,
    briefDescription,
    expandedDetails,
    includes,
    bookingSummary,
    requiresBirthChart,
    requiresAkashic,
    requiresQuestions,
    stripePaymentLink,
    seo
  }
`;

export const readingBySlugQuery = groq`
  *[_type == "reading" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    tag,
    subtitle,
    price,
    priceDisplay,
    valueProposition,
    briefDescription,
    expandedDetails,
    includes,
    bookingSummary,
    requiresBirthChart,
    requiresAkashic,
    requiresQuestions,
    stripePaymentLink,
    seo
  }
`;

export const readingSlugsQuery = groq`
  *[_type == "reading"] { "slug": slug.current }
`;

export const testimonialsQuery = groq`
  *[_type == "testimonial"] | order(order asc) {
    _id,
    quote,
    name,
    "detail": coalesce(readingType->subtitle, detailOverride),
    order
  }
`;

export const faqItemsQuery = groq`
  *[_type == "faqItem"] | order(order asc) {
    _id,
    question,
    answer,
    order
  }
`;

export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    brandName,
    "logoUrl": logo.asset->url,
    "faviconUrl": favicon.asset->url,
    navLinks,
    navCtaText,
    socialLinks,
    copyrightText,
    contactEmail
  }
`;

export const bookingPageQuery = groq`
  *[_type == "bookingPage"][0] {
    emailLabel,
    emailDisclaimer,
    paymentButtonText,
    securityNote,
    entertainmentAcknowledgment,
    coolingOffAcknowledgment,
    formatNote,
    closingMessage,
    deliveryNote,
    seo
  }
`;

export const thankYouPageQuery = groq`
  *[_type == "thankYouPage"][0] {
    heading,
    subheading,
    steps,
    closingMessage,
    returnButtonText,
    seo
  }
`;

export const themeQuery = groq`
  *[_type == "theme"][0] {
    colors,
    displayFont,
    bodyFont
  }
`;

export const underConstructionPageQuery = groq`
  *[_type == "underConstructionPage"][0] {
    tag,
    heading,
    description,
    "imageUrl": image.asset->url,
    imageAlt,
    contactText,
    seo
  }
`;

export const notFoundPageQuery = groq`
  *[_type == "notFoundPage"][0] {
    tag,
    heading,
    description,
    buttonText,
    seo
  }
`;

export const bookingFormQuery = groq`
  *[_type == "bookingForm"][0] {
    title,
    intro,
    description,
    confirmationMessage,
    nonRefundableNotice,
    entryPageContent {
      letterOpener,
      letterBridge,
      letterClosing,
      dropCapCta,
      dropCapCaption,
      changeReadingLinkText,
      aboutJosephineLinkText,
      letterTitle
    },
    consentBlock {
      trustLine
    },
    pagination {
      overrides[] {
        readingSlug,
        pageCount
      }
    },
    "sections": sections[]-> {
      _id,
      sectionTitle,
      sectionDescription,
      order,
      pageBoundary,
      marginaliaLabel,
      transitionLine,
      "appliesToServices": appliesToServices[]->slug.current,
      "fields": fields[]-> {
        _id,
        key,
        label,
        type,
        placeholder,
        helpText,
        helperPosition,
        clarificationNote,
        iconKey,
        placeAutocompleteSource,
        required,
        system,
        order,
        multiSelectCount,
        options[] {
          value,
          label,
          category,
          categoryOrder,
          nameFollowup
        },
        validation,
        "appliesToServices": appliesToServices[]->slug.current
      }
    } | order(order asc)
  }
`;

export const legalPageBySlugQuery = groq`
  *[_type == "legalPage" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    tag,
    lastUpdated,
    body,
    seo {
      metaTitle,
      metaDescription
    }
  }
`;
