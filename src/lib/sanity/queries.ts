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
    intakeIntro,
    price,
    priceDisplay,
    valueProposition,
    briefDescription,
    expandedDetails,
    includes,
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
    intakeIntro,
    price,
    priceDisplay,
    valueProposition,
    briefDescription,
    expandedDetails,
    includes,
    requiresBirthChart,
    requiresAkashic,
    requiresQuestions,
    stripePaymentLink,
    estimatedMinutes,
    facts[] {
      label,
      value
    },
    hideFacts,
    "questionsOnPage": questionsOnPage[]-> {
      _id,
      question,
      answer
    },
    "formTestimonial": formTestimonial-> {
      _id,
      quote,
      name,
      "detail": coalesce(readingType->subtitle, detailOverride)
    },
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
    order,
    "relatedArticle": relatedArticle-> {
      title,
      "slug": slug.current
    }
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

export const emailPrivacyExportQuery = groq`
  *[_type == "emailPrivacyExport"][0] {
    subject,
    preview,
    heroLine,
    bodyIntro,
    bodyPostButton,
    greeting,
    introLine,
    contentsLine,
    ctaLabel,
    expiryLine,
    signOff
  }
`;

export const emailMagicLinkQuery = groq`
  *[_type == "emailMagicLink"][0] {
    subject,
    preview,
    heroLine,
    buttonLabel,
    greeting,
    body,
    signOff
  }
`;

export const emailOrderConfirmationQuery = groq`
  *[_type == "emailOrderConfirmation"][0] {
    subject,
    preview,
    brandName,
    brandSubtitle,
    heroLine,
    body,
    cardLabel,
    cardDeliveryLine,
    dataExportHeading,
    dataExportBlurb,
    dataExportButtonLabel,
    signOffLine1,
    signOffLine2,
    footerDisclaimer
  }
`;

export const emailDay7DeliveryQuery = groq`
  *[_type == "emailDay7Delivery"][0] {
    subjectTemplate,
    preview,
    bodyIntro,
    bodyPostButton,
    greeting,
    lineReady,
    comfortLine,
    openButtonLabel,
    signedInDisclosure,
    accessWindowLine,
    comfortFollowUp,
    signOff
  }
`;

export const emailSharedShellQuery = groq`
  *[_id == "emailSharedShell"][0] {
    brandName,
    brandSubtitle,
    signOffLine1,
    signOffLine2,
    footerDisclaimer
  }
`;

export const listenPageQuery = groq`
  *[_type == "listenPage"][0] {
    welcomeRibbon,
    recipientGreeting,
    deliveredHeading,
    deliveredSubheading,
    voiceNoteLabel,
    voiceNoteButtonLabel,
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
    assetTroubleMailtoSubject,
    expiredHeading,
    expiredBody,
    expiredMailtoLabel,
    expiredMailtoSubject
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
      letterTitle
    },
    readingPageContent {
      eyebrow,
      foldRowLabel,
      facts[] {
        label,
        value
      },
      hideFacts,
      factsPerRowPhone,
      factsPerRowDesktop,
      factsBalanceRows,
      factsListOnPhones,
      readerName,
      readerLine,
      hideReaderPhoto,
      includedTitle,
      howItWorksTitle,
      questionsTitle,
      otherReadingsTitle,
      testimonialLabel,
      minutesTemplate
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

export const notesStateQuery = groq`
  {
    "settings": *[_type == "notesSettings"][0] {
      ...,
      "authorPhotoUrl": coalesce(
        authorPhoto.asset->url,
        *[_type == "landingPage"][0].about.image.asset->url
      ),
      "indexIllustrationUrl": indexIllustration.asset->url
    },
    "publishedCount": count(*[_type == "article" && defined(slug.current)])
  }
`;

const articleBaseFields = `
  _id,
  title,
  "slug": slug.current,
  subtitle,
  publishedAt,
  updatedAt
`;

export const articlesQuery = groq`
  *[_type == "article" && defined(slug.current)] | order(publishedAt desc) {
    ${articleBaseFields},
    "wordCount": math::sum(body[_type == "block"]{ "n": length(string::split(pt::text(@), " ")) }.n)
  }
`;

export const articleBySlugQuery = groq`
  *[_type == "article" && slug.current == $slug][0] {
    ${articleBaseFields},
    searchDescription,
    body[] {
      ...,
      _type == "image" => {
        "url": asset->url,
        "width": asset->metadata.dimensions.width,
        "height": asset->metadata.dimensions.height
      },
      markDefs[] {
        ...,
        _type == "noteLink" => { "slug": note->slug.current }
      }
    },
    "relatedReading": relatedReading-> {
      name,
      "slug": slug.current,
      priceDisplay,
      valueProposition
    },
    "moreNotes": moreNotes[]-> { title, "slug": slug.current },
    hideReadingBox,
    hideCardLeadIn,
    hideMoreNotes,
    "audioUrl": audio.asset->url,
    audioMinutes
  }
`;

export const articleSlugsQuery = groq`
  *[_type == "article" && defined(slug.current)] { "slug": slug.current }
`;

export const articleDatesQuery = groq`
  *[_type == "article" && defined(slug.current)] { "slug": slug.current, publishedAt, updatedAt }
`;

export const readingNotesQuery = groq`
  *[_type == "article" && relatedReading->slug.current == $slug && defined(slug.current)]
    | order(publishedAt desc) { title, "slug": slug.current }
`;
