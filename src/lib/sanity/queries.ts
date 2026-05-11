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
    contactEmail,
    consentBanner
  }
`;

export const bookingPageQuery = groq`
  *[_type == "bookingPage"][0] {
    paymentButtonText,
    formatNote,
    deliveryNote,
    whatsIncludedHeading,
    bookReadingCtaText,
    seo
  }
`;

export const thankYouPageQuery = groq`
  *[_type == "thankYouPage"][0] {
    heading,
    subheading,
    readingLabel,
    confirmationBody,
    timelineBody,
    deliveryDaysPhrase,
    contactBody,
    closingMessage,
    returnButtonText,
    "overrides": overrides[]{
      "readingSlug": reading->slug.current,
      heading,
      subheading,
      confirmationBody,
      timelineBody,
      contactBody,
      closingMessage
    },
    seo
  }
`;

export const myReadingsPageQuery = groq`
  *[_type == "myReadingsPage"][0] {
    listHeading,
    listSubheading,
    openButtonLabel,
    emptyHeading,
    emptyCtaLabel,
    signInHeading,
    signInBody,
    signInButtonLabel,
    signInFootnote,
    checkEmailHeading,
    checkEmailBody,
    checkEmailResendLabel
  }
`;

export const magicLinkVerifyPageQuery = groq`
  *[_type == "magicLinkVerifyPage"][0] {
    confirmHeading,
    confirmBody,
    confirmEmailLabel,
    confirmButtonLabel,
    confirmFootnote,
    restedHeading,
    restedBody,
    restedCtaLabel
  }
`;

export const emailMagicLinkQuery = groq`
  *[_type == "emailMagicLink"][0] {
    subject,
    preview,
    greeting,
    body,
    signOff
  }
`;

export const emailDay7DeliveryQuery = groq`
  *[_type == "emailDay7Delivery"][0] {
    subjectTemplate,
    preview,
    greeting,
    lineReady,
    comfortLine,
    openButtonLabel,
    signedInDisclosure,
    comfortFollowUp,
    signOff
  }
`;

export const listenPageQuery = groq`
  *[_type == "listenPage"][0] {
    welcomeRibbon,
    deliveredHeading,
    deliveredSubheading,
    voiceNoteLabel,
    pdfLabel,
    pdfButtonLabel,
    closerLine1,
    closerLine2,
    signInHeading,
    signInBody,
    signInButtonLabel,
    signInFootnote,
    checkEmailHeading,
    checkEmailBody,
    checkEmailResendLabel,
    restedHeading,
    restedBody,
    restedCtaLabel,
    throttledHeading,
    throttledBody,
    throttledMailtoLabel,
    throttledMailtoSubject,
    assetTroubleHeading,
    assetTroubleBody,
    assetTroubleTryAgainLabel,
    assetTroubleMailtoLabel,
    assetTroubleMailtoSubject
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
    pagination {
      overrides[] {
        readingSlug,
        pageCount
      }
    },
    loadingStateCopy,
    nextButtonText,
    saveAndContinueLaterText,
    pageIndicatorTagline,
    "sections": sections[]-> {
      _id,
      sectionTitle,
      sectionDescription,
      order,
      pageBoundary,
      marginaliaLabel,
      transitionLine,
      clarificationNote,
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
