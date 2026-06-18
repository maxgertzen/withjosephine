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
    giftPurchaserHeading,
    giftPurchaserSubheading,
    giftPurchaserBody,
    giftPurchaserSelfSendSubheading,
    giftPurchaserSelfSendBody,
    giftPurchaserReadingLabel,
    giftPurchaserTimelineBody,
    giftPurchaserContactBody,
    giftRecipientHeading,
    giftRecipientSubheading,
    giftRecipientBody,
    giftRecipientContactBody,
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
    expiredRowLabel,
    expiredMailtoLabel,
    expiredMailtoSubject,
    signInHeading,
    signInBody,
    signInButtonLabel,
    signInFootnote,
    checkEmailHeading,
    checkEmailBody,
    checkEmailResendLabel,
    readingsTabLabel,
    giftsTabLabel,
    welcomeHeading,
    welcomeSubhead,
    welcomeButtonLabel
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
    editRecipientSelfSendIndicator,
    editRecipientFormRecipientNameLabel,
    editRecipientFormRecipientEmailLabel,
    editRecipientFormSendAtLabel,
    editRecipientTimezoneLabel,
    editRecipientTimezonePlaceholder,
    editRecipientTimezoneFallbackHelp,
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
    resendRetryFallbackLabel,
    flipToScheduledCtaLabel,
    flipToScheduledFormTitle,
    flipToScheduledSaveButtonLabel,
    flipToScheduledSavingLabel
  }
`;

export const giftClaimPageQuery = groq`
  *[_type == "giftClaimPage"][0] {
    seoTitle,
    seoDescription,
    noTokenHeading,
    noTokenBody,
    alreadyClaimedHeading,
    alreadyClaimedBody,
    sessionExpiredHeading,
    sessionExpiredBody,
    alreadySubmittedHeading,
    alreadySubmittedBody,
    welcomeHeading,
    welcomeBody,
    welcomeCtaLabel
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

export const emailMagicLinkLibraryQuery = groq`
  *[_type == "emailMagicLinkLibrary"][0] {
    subject,
    preview,
    heroLine,
    buttonLabel,
    greeting,
    body,
    signOff
  }
`;

export const emailStepUpOtpQuery = groq`
  *[_type == "emailStepUpOtp"][0] {
    subject,
    preview,
    heroLine,
    intro,
    codeLabel,
    expiryLine,
    closingLine,
    signoff
  }
`;

export const emailNewDeviceNoticeQuery = groq`
  *[_type == "emailNewDeviceNotice"][0] {
    subject,
    preview,
    heroLine,
    bodyIntro,
    wasItYouButtonLabel,
    bodyPostButton,
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
    signOffLine1,
    signOffLine2,
    footerDisclaimer
  }
`;

export const emailRecipientIntakeReceivedQuery = groq`
  *[_type == "emailRecipientIntakeReceived"][0] {
    subject,
    preview,
    brandName,
    brandSubtitle,
    heroLine,
    body,
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

export const emailGiftPurchaseConfirmationSelfSendQuery = groq`
  *[_type == "emailGiftPurchaseConfirmationSelfSend"][0] {
    subject,
    preview,
    brandName,
    brandSubtitle,
    heroLine,
    body,
    greeting,
    detailLineSelfSend,
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

export const emailGiftPurchaseConfirmationScheduledQuery = groq`
  *[_type == "emailGiftPurchaseConfirmationScheduled"][0] {
    subject,
    preview,
    brandName,
    brandSubtitle,
    heroLine,
    body,
    greeting,
    detailLineScheduled,
    cardLabel,
    cardDeliveryLine,
    refundLine,
    signOffLine1,
    signOffLine2,
    footerDisclaimer
  }
`;

export const emailGiftClaimQuery = groq`
  *[_type == "emailGiftClaim"][0] {
    subjectFirstSend,
    previewFirstSend,
    brandName,
    brandSubtitle,
    heroLineFirstSend,
    body,
    greeting,
    bodyFirstSend,
    giftMessageLabel,
    claimButtonLabel,
    claimUrlHelper,
    cardLabel,
    cardDeliveryLine,
    signOffLine1,
    signOffLine2,
    footerDisclaimer
  }
`;

export const emailGiftClaimReminderQuery = groq`
  *[_type == "emailGiftClaimReminder"][0] {
    subject,
    preview,
    brandName,
    brandSubtitle,
    heroLine,
    body,
    giftMessageLabel,
    cardLabel,
    cardDeliveryLine,
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
