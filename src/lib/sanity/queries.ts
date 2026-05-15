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

export const myGiftsPageQuery = groq`
  *[_type == "myGiftsPage"][0] {
    listHeading,
    listSubheading,
    emptyHeading,
    emptyBody,
    emptyCtaLabel,
    signInHeading,
    signInBody,
    signInButtonLabel,
    signInFootnote,
    checkEmailHeading,
    checkEmailBody,
    checkEmailResendLabel,
    statusScheduledLabel,
    statusSelfSendReadyLabel,
    statusSentLabel,
    statusPreparingLabel,
    statusDeliveredLabel,
    statusCancelledLabel,
    editRecipientCtaLabel,
    flipToSelfSendCtaLabel,
    resendLinkCtaLabel,
    privacyNote,
    editRecipientFormTitle,
    editRecipientFormRecipientNameLabel,
    editRecipientFormRecipientEmailLabel,
    editRecipientFormSendAtLabel,
    editRecipientSaveButtonLabel,
    editRecipientSavingLabel,
    editRecipientCancelButtonLabel,
    flipConfirmCtaLabel,
    flipSwitchingLabel,
    resendSendingLabel,
    resendThrottledMessage,
    actionGenericError,
    actionNetworkError,
    actionClosedError,
    editRecipientSendAtPreviewTemplate,
    resendRetryAfterHourTemplate,
    resendRetryAfterDayTemplate,
    resendRetryFallbackLabel
  }
`;

export const giftClaimPageQuery = groq`
  *[_type == "giftClaimPage"][0] {
    seoTitle,
    seoDescription,
    noTokenHeading,
    noTokenBody,
    alreadyClaimedHeading,
    alreadyClaimedBody
  }
`;

export const giftIntakePageQuery = groq`
  *[_type == "giftIntakePage"][0] {
    seoTitle,
    seoDescription,
    eyebrow,
    heading,
    headingWelcome,
    lede
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

export const emailOrderConfirmationQuery = groq`
  *[_type == "emailOrderConfirmation"][0] {
    subject,
    preview,
    brandName,
    brandSubtitle,
    heroLine,
    greeting,
    thanksLine,
    timelineLine,
    contactLine,
    cardLabel,
    cardDeliveryLine,
    signOffLine1,
    signOffLine2,
    footerDisclaimer
  }
`;

export const emailGiftPurchaseConfirmationQuery = groq`
  *[_type == "emailGiftPurchaseConfirmation"][0] {
    subjectSelfSend,
    subjectScheduled,
    previewSelfSend,
    previewScheduled,
    brandName,
    brandSubtitle,
    heroLineSelfSend,
    heroLineScheduled,
    greeting,
    detailLineSelfSend,
    detailLineScheduled,
    shareButtonLabel,
    shareUrlHelper,
    cardLabel,
    cardDeliveryLine,
    refundLine,
    signOffLine1,
    signOffLine2,
    footerDisclaimer
  }
`;

export const emailDay2StartedQuery = groq`
  *[_type == "emailDay2Started"][0] {
    subject,
    preview,
    greeting,
    body,
    signOff
  }
`;

export const emailGiftClaimQuery = groq`
  *[_type == "emailGiftClaim"][0] {
    subjectFirstSend,
    subjectReminder,
    previewFirstSend,
    previewReminder,
    brandName,
    brandSubtitle,
    heroLineFirstSend,
    heroLineReminder,
    greeting,
    bodyFirstSend,
    bodyReminder,
    giftMessageLabel,
    claimButtonLabel,
    claimUrlHelper,
    cardLabel,
    cardDeliveryLine,
    reminderContactLine,
    signOffLine1,
    signOffLine2,
    footerDisclaimer
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
      letterTitle,
      giftToggleForMeLabel,
      giftToggleAsGiftLabel,
      giftToggleHelper
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

export const bookingGiftFormQuery = groq`
  *[_type == "bookingGiftForm"][0] {
    heading,
    subheading,
    deliveryMethodLabel,
    deliveryMethodSelfSendLabel,
    deliveryMethodSelfSendHelper,
    deliveryMethodScheduledLabel,
    deliveryMethodScheduledHelper,
    purchaserFirstNameLabel,
    purchaserFirstNameHelper,
    purchaserEmailLabel,
    purchaserEmailHelper,
    recipientNameLabelSelfSend,
    recipientNamePlaceholderSelfSend,
    recipientNameLabelScheduled,
    recipientNameHelperScheduled,
    recipientEmailLabel,
    recipientEmailHelper,
    giftMessageLabel,
    giftMessagePlaceholder,
    sendAtSectionLabel,
    sendAtPresetNow,
    sendAtPresetWeek,
    sendAtPresetMonth,
    sendAtCustomLabel,
    consentIntro,
    nonRefundableNotice,
    submitButtonSelfSend,
    submitButtonScheduled,
    loadingStateCopy,
    antiAbuseCapHeading,
    antiAbuseCapBody,
    firstNameRequiredError,
    emailInvalidError,
    recipientNameRequiredError,
    recipientEmailRequiredError,
    sendAtRequiredError,
    consentRequiredError,
    verificationError,
    genericError,
    networkError,
    sendAtTimezoneHint
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
