import { cache } from "react";

import { GIFT_CLAIM_PAGE_DEFAULTS } from "@/data/defaults";

import { sanityClient } from "./client";
import { sanityFetch } from "./live";
import { pickDefined } from "./pickDefined";
import {
  bookingFormQuery,
  bookingGiftFormQuery,
  bookingPageQuery,
  emailDay7DeliveryQuery,
  emailGiftClaimQuery,
  emailGiftClaimReminderQuery,
  emailGiftPurchaseConfirmationScheduledQuery,
  emailGiftPurchaseConfirmationSelfSendQuery,
  emailMagicLinkLibraryQuery,
  emailMagicLinkQuery,
  emailNewDeviceNoticeQuery,
  emailOrderConfirmationQuery,
  emailPrivacyExportQuery,
  emailRecipientIntakeReceivedQuery,
  emailSharedShellQuery,
  emailStepUpOtpQuery,
  faqItemsQuery,
  giftClaimPageQuery,
  giftIntakePageQuery,
  landingPageQuery,
  legalPageBySlugQuery,
  listenPageQuery,
  magicLinkVerifyPageQuery,
  myGiftsPageQuery,
  myReadingsPageQuery,
  notFoundPageQuery,
  readingBySlugQuery,
  readingSlugsQuery,
  readingsQuery,
  siteSettingsQuery,
  testimonialsQuery,
  thankYouPageQuery,
  themeQuery,
  underConstructionPageQuery,
} from "./queries";
import type {
  SanityBookingForm,
  SanityBookingGiftForm,
  SanityBookingPage,
  SanityEmailDay7Delivery,
  SanityEmailGiftClaim,
  SanityEmailGiftClaimReminder,
  SanityEmailGiftPurchaseConfirmationScheduled,
  SanityEmailGiftPurchaseConfirmationSelfSend,
  SanityEmailMagicLink,
  SanityEmailMagicLinkLibrary,
  SanityEmailNewDeviceNotice,
  SanityEmailOrderConfirmation,
  SanityEmailPrivacyExport,
  SanityEmailRecipientIntakeReceived,
  SanityEmailSharedShell,
  SanityEmailStepUpOtp,
  SanityFaqItem,
  SanityGiftClaimPage,
  SanityGiftIntakePage,
  SanityLandingPage,
  SanityLegalPage,
  SanityListenPage,
  SanityMagicLinkVerifyPage,
  SanityMyGiftsPage,
  SanityMyReadingsPage,
  SanityNotFoundPage,
  SanityReading,
  SanitySiteSettings,
  SanityTestimonial,
  SanityThankYouPage,
  SanityTheme,
  SanityUnderConstructionPage,
} from "./types";

/**
 * Thin wrappers around `sanityFetch` so call sites stay typed and ergonomic
 * (`const data = await fetchX()` rather than `const { data } = await ...`).
 *
 * Each function is wrapped with React `cache()` to deduplicate calls within a
 * single server request (e.g. `generateMetadata` + page component both calling
 * the same fetch). `sanityFetch` handles draft-mode switching and live
 * revalidation tagging internally; outside a request scope (e.g.
 * `generateStaticParams` at build) it falls back to the published perspective.
 *
 * Each call passes an explicit type generic to `sanityFetch<T>` — this is the
 * single layer where the typed wrapper bridges next-sanity v12+'s strict
 * `unknown` default. See `./live.ts` for the wrapper rationale.
 */

export const fetchLandingPage = cache(async (): Promise<SanityLandingPage | null> => {
  const { data } = await sanityFetch<SanityLandingPage | null>({ query: landingPageQuery });
  return data;
});

export const fetchReadings = cache(async (): Promise<SanityReading[]> => {
  const { data } = await sanityFetch<SanityReading[] | null>({ query: readingsQuery });
  return data ?? [];
});

export const fetchReading = cache(async (slug: string): Promise<SanityReading | null> => {
  const { data } = await sanityFetch<SanityReading | null>({
    query: readingBySlugQuery,
    params: { slug },
  });
  return data;
});

/**
 * Bypasses `sanityFetch` because this is only ever called from
 * `generateStaticParams`, which runs at build time outside any HTTP request
 * scope — `sanityFetch`/`draftMode()` would throw there. Static params are
 * always sourced from published documents anyway.
 */
export async function fetchReadingSlugs(): Promise<{ slug: string }[]> {
  return (await sanityClient.fetch<{ slug: string }[] | null>(readingSlugsQuery)) ?? [];
}

export const fetchTestimonials = cache(async (): Promise<SanityTestimonial[]> => {
  const { data } = await sanityFetch<SanityTestimonial[] | null>({ query: testimonialsQuery });
  return data ?? [];
});

export const fetchFaqItems = cache(async (): Promise<SanityFaqItem[]> => {
  const { data } = await sanityFetch<SanityFaqItem[] | null>({ query: faqItemsQuery });
  return data ?? [];
});

export const fetchSiteSettings = cache(async (): Promise<SanitySiteSettings | null> => {
  const { data } = await sanityFetch<SanitySiteSettings | null>({ query: siteSettingsQuery });
  return data;
});

export const fetchBookingPage = cache(async (): Promise<SanityBookingPage | null> => {
  const { data } = await sanityFetch<SanityBookingPage | null>({ query: bookingPageQuery });
  return data;
});

export const fetchThankYouPage = cache(async (): Promise<SanityThankYouPage | null> => {
  const { data } = await sanityFetch<SanityThankYouPage | null>({ query: thankYouPageQuery });
  return data;
});

export const fetchTheme = cache(async (): Promise<SanityTheme | null> => {
  const { data } = await sanityFetch<SanityTheme | null>({ query: themeQuery });
  return data;
});

export const fetchUnderConstructionPage = cache(
  async (): Promise<SanityUnderConstructionPage | null> => {
    const { data } = await sanityFetch<SanityUnderConstructionPage | null>({
      query: underConstructionPageQuery,
    });
    return data;
  },
);

export const fetchNotFoundPage = cache(async (): Promise<SanityNotFoundPage | null> => {
  const { data } = await sanityFetch<SanityNotFoundPage | null>({ query: notFoundPageQuery });
  return data;
});

export const fetchBookingForm = cache(async (): Promise<SanityBookingForm | null> => {
  const { data } = await sanityFetch<SanityBookingForm | null>({ query: bookingFormQuery });
  return data;
});

export const fetchBookingGiftForm = cache(async (): Promise<SanityBookingGiftForm | null> => {
  const { data } = await sanityFetch<SanityBookingGiftForm | null>({ query: bookingGiftFormQuery });
  return data;
});

export const fetchLegalPage = cache(async (slug: string): Promise<SanityLegalPage | null> => {
  const { data } = await sanityFetch<SanityLegalPage | null>({
    query: legalPageBySlugQuery,
    params: { slug },
  });
  return data;
});

export const fetchMyReadingsPage = cache(async (): Promise<SanityMyReadingsPage | null> => {
  const { data } = await sanityFetch<SanityMyReadingsPage | null>({ query: myReadingsPageQuery });
  return data;
});

export const fetchMyGiftsPage = cache(async (): Promise<SanityMyGiftsPage | null> => {
  const { data } = await sanityFetch<SanityMyGiftsPage | null>({ query: myGiftsPageQuery });
  return data;
});

export const fetchGiftClaimPage = cache(async (): Promise<SanityGiftClaimPage | null> => {
  const { data } = await sanityFetch<SanityGiftClaimPage | null>({ query: giftClaimPageQuery });
  return data;
});

export const loadGiftClaimCopy = cache(async () => {
  const sanityCopy = await fetchGiftClaimPage();
  return { ...GIFT_CLAIM_PAGE_DEFAULTS, ...pickDefined(sanityCopy ?? {}) };
});

export const fetchGiftIntakePage = cache(async (): Promise<SanityGiftIntakePage | null> => {
  const { data } = await sanityFetch<SanityGiftIntakePage | null>({ query: giftIntakePageQuery });
  return data;
});

export const fetchMagicLinkVerifyPage = cache(
  async (): Promise<SanityMagicLinkVerifyPage | null> => {
    const { data } = await sanityFetch<SanityMagicLinkVerifyPage | null>({
      query: magicLinkVerifyPageQuery,
    });
    return data;
  },
);

export const fetchEmailMagicLink = cache(async (): Promise<SanityEmailMagicLink | null> => {
  const { data } = await sanityFetch<SanityEmailMagicLink | null>({ query: emailMagicLinkQuery });
  return data;
});

export const fetchEmailMagicLinkLibrary = cache(
  async (): Promise<SanityEmailMagicLinkLibrary | null> => {
    const { data } = await sanityFetch<SanityEmailMagicLinkLibrary | null>({
      query: emailMagicLinkLibraryQuery,
    });
    return data;
  },
);

export const fetchEmailStepUpOtp = cache(async (): Promise<SanityEmailStepUpOtp | null> => {
  const { data } = await sanityFetch<SanityEmailStepUpOtp | null>({
    query: emailStepUpOtpQuery,
  });
  return data;
});

export const fetchEmailNewDeviceNotice = cache(
  async (): Promise<SanityEmailNewDeviceNotice | null> => {
    const { data } = await sanityFetch<SanityEmailNewDeviceNotice | null>({
      query: emailNewDeviceNoticeQuery,
    });
    return data;
  },
);

export const fetchEmailPrivacyExport = cache(
  async (): Promise<SanityEmailPrivacyExport | null> => {
    const { data } = await sanityFetch<SanityEmailPrivacyExport | null>({
      query: emailPrivacyExportQuery,
    });
    return data;
  },
);

export const fetchEmailDay7Delivery = cache(async (): Promise<SanityEmailDay7Delivery | null> => {
  const { data } = await sanityFetch<SanityEmailDay7Delivery | null>({
    query: emailDay7DeliveryQuery,
  });
  return data;
});

export const fetchEmailOrderConfirmation = cache(
  async (): Promise<SanityEmailOrderConfirmation | null> => {
    const { data } = await sanityFetch<SanityEmailOrderConfirmation | null>({
      query: emailOrderConfirmationQuery,
    });
    return data;
  },
);

export const fetchEmailRecipientIntakeReceived = cache(
  async (): Promise<SanityEmailRecipientIntakeReceived | null> => {
    const { data } = await sanityFetch<SanityEmailRecipientIntakeReceived | null>({
      query: emailRecipientIntakeReceivedQuery,
    });
    return data;
  },
);

export const fetchEmailGiftClaim = cache(async (): Promise<SanityEmailGiftClaim | null> => {
  const { data } = await sanityFetch<SanityEmailGiftClaim | null>({
    query: emailGiftClaimQuery,
  });
  return data;
});

export const fetchEmailGiftClaimReminder = cache(
  async (): Promise<SanityEmailGiftClaimReminder | null> => {
    const { data } = await sanityFetch<SanityEmailGiftClaimReminder | null>({
      query: emailGiftClaimReminderQuery,
    });
    return data;
  },
);

export const fetchEmailGiftPurchaseConfirmationSelfSend = cache(
  async (): Promise<SanityEmailGiftPurchaseConfirmationSelfSend | null> => {
    const { data } = await sanityFetch<SanityEmailGiftPurchaseConfirmationSelfSend | null>({
      query: emailGiftPurchaseConfirmationSelfSendQuery,
    });
    return data;
  },
);

export const fetchEmailGiftPurchaseConfirmationScheduled = cache(
  async (): Promise<SanityEmailGiftPurchaseConfirmationScheduled | null> => {
    const { data } = await sanityFetch<SanityEmailGiftPurchaseConfirmationScheduled | null>({
      query: emailGiftPurchaseConfirmationScheduledQuery,
    });
    return data;
  },
);

export const fetchEmailSharedShell = cache(
  async (): Promise<SanityEmailSharedShell | null> => {
    const { data } = await sanityFetch<SanityEmailSharedShell | null>({
      query: emailSharedShellQuery,
    });
    return data;
  },
);

export const fetchListenPage = cache(async (): Promise<SanityListenPage | null> => {
  const { data } = await sanityFetch<SanityListenPage | null>({ query: listenPageQuery });
  return data;
});
