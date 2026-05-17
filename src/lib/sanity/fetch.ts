import { cache } from "react";

import { sanityClient } from "./client";
import { sanityFetch } from "./live";
import {
  bookingFormQuery,
  bookingGiftFormQuery,
  bookingPageQuery,
  emailDay2StartedQuery,
  emailDay7DeliveryQuery,
  emailGiftClaimQuery,
  emailGiftPurchaseConfirmationQuery,
  emailMagicLinkQuery,
  emailOrderConfirmationQuery,
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
  SanityEmailDay2Started,
  SanityEmailDay7Delivery,
  SanityEmailGiftClaim,
  SanityEmailGiftPurchaseConfirmation,
  SanityEmailMagicLink,
  SanityEmailOrderConfirmation,
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

export const fetchEmailGiftClaim = cache(async (): Promise<SanityEmailGiftClaim | null> => {
  const { data } = await sanityFetch<SanityEmailGiftClaim | null>({
    query: emailGiftClaimQuery,
  });
  return data;
});

export const fetchEmailGiftPurchaseConfirmation = cache(
  async (): Promise<SanityEmailGiftPurchaseConfirmation | null> => {
    const { data } = await sanityFetch<SanityEmailGiftPurchaseConfirmation | null>({
      query: emailGiftPurchaseConfirmationQuery,
    });
    return data;
  },
);

export const fetchEmailDay2Started = cache(async (): Promise<SanityEmailDay2Started | null> => {
  const { data } = await sanityFetch<SanityEmailDay2Started | null>({
    query: emailDay2StartedQuery,
  });
  return data;
});

export const fetchListenPage = cache(async (): Promise<SanityListenPage | null> => {
  const { data } = await sanityFetch<SanityListenPage | null>({ query: listenPageQuery });
  return data;
});
