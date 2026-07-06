import { cache } from "react";

import { getSanityFreshReadClient, sanityClient } from "./client";
import { sanityFetch } from "./live";
import { publishedFetch } from "./publishedFetch";
import {
  bookingFormQuery,
  bookingPageQuery,
  emailDay7DeliveryQuery,
  emailMagicLinkQuery,
  emailOrderConfirmationQuery,
  emailPrivacyExportQuery,
  emailSharedShellQuery,
  faqItemsQuery,
  landingPageQuery,
  legalPageBySlugQuery,
  listenPageQuery,
  magicLinkVerifyPageQuery,
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
  SanityBookingPage,
  SanityEmailDay7Delivery,
  SanityEmailMagicLink,
  SanityEmailOrderConfirmation,
  SanityEmailPrivacyExport,
  SanityEmailSharedShell,
  SanityFaqItem,
  SanityLandingPage,
  SanityLegalPage,
  SanityListenPage,
  SanityMagicLinkVerifyPage,
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

export const fetchLegalPage = cache(async (slug: string): Promise<SanityLegalPage | null> => {
  const { data } = await sanityFetch<SanityLegalPage | null>({
    query: legalPageBySlugQuery,
    params: { slug },
  });
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

// Email copy bypasses `sanityFetch` (the live/cached path) so cron/DO/webhook
// sends always render the latest published template. See `getSanityFreshReadClient`.
async function fetchEmailCopy<T>(query: string): Promise<T | null> {
  const client = await getSanityFreshReadClient();
  return client.fetch<T | null>(query);
}

export const fetchEmailMagicLink = cache((): Promise<SanityEmailMagicLink | null> =>
  fetchEmailCopy<SanityEmailMagicLink>(emailMagicLinkQuery),
);

export const fetchEmailPrivacyExport = cache((): Promise<SanityEmailPrivacyExport | null> =>
  fetchEmailCopy<SanityEmailPrivacyExport>(emailPrivacyExportQuery),
);

export const fetchEmailDay7Delivery = cache((): Promise<SanityEmailDay7Delivery | null> =>
  fetchEmailCopy<SanityEmailDay7Delivery>(emailDay7DeliveryQuery),
);

export const fetchEmailOrderConfirmation = cache((): Promise<SanityEmailOrderConfirmation | null> =>
  fetchEmailCopy<SanityEmailOrderConfirmation>(emailOrderConfirmationQuery),
);

export const fetchEmailSharedShell = cache((): Promise<SanityEmailSharedShell | null> =>
  fetchEmailCopy<SanityEmailSharedShell>(emailSharedShellQuery),
);

export const fetchListenPage = cache(async (): Promise<SanityListenPage | null> => {
  const { data } = await sanityFetch<SanityListenPage | null>({ query: listenPageQuery });
  return data;
});

// Published-perspective fetchers keep public pages static/ISR; the live `fetch*`
// above force dynamic via draftMode and are for the /preview surface only. Tags
// are the revalidateTag handle for the Sanity content webhook.
export const fetchLandingPagePublished = cache(async (): Promise<SanityLandingPage | null> =>
  publishedFetch<SanityLandingPage | null>({ query: landingPageQuery, tags: ["landingPage"] }));

export const fetchReadingsPublished = cache(async (): Promise<SanityReading[]> =>
  (await publishedFetch<SanityReading[] | null>({ query: readingsQuery, tags: ["reading"] })) ?? []);

export const fetchTestimonialsPublished = cache(async (): Promise<SanityTestimonial[]> =>
  (await publishedFetch<SanityTestimonial[] | null>({
    query: testimonialsQuery,
    tags: ["testimonial"],
  })) ?? []);

export const fetchFaqItemsPublished = cache(async (): Promise<SanityFaqItem[]> =>
  (await publishedFetch<SanityFaqItem[] | null>({ query: faqItemsQuery, tags: ["faqItem"] })) ?? []);

export const fetchSiteSettingsPublished = cache(async (): Promise<SanitySiteSettings | null> =>
  publishedFetch<SanitySiteSettings | null>({ query: siteSettingsQuery, tags: ["siteSettings"] }));

export const fetchLegalPagePublished = cache(
  async (slug: string): Promise<SanityLegalPage | null> =>
    publishedFetch<SanityLegalPage | null>({
      query: legalPageBySlugQuery,
      params: { slug },
      tags: ["legalPage", `legalPage:${slug}`],
    }),
);

export const fetchUnderConstructionPagePublished = cache(
  async (): Promise<SanityUnderConstructionPage | null> =>
    publishedFetch<SanityUnderConstructionPage | null>({
      query: underConstructionPageQuery,
      tags: ["underConstructionPage"],
    }),
);

export const fetchNotFoundPagePublished = cache(async (): Promise<SanityNotFoundPage | null> =>
  publishedFetch<SanityNotFoundPage | null>({ query: notFoundPageQuery, tags: ["notFoundPage"] }));

export const fetchReadingPublished = cache(
  async (slug: string): Promise<SanityReading | null> =>
    publishedFetch<SanityReading | null>({
      query: readingBySlugQuery,
      params: { slug },
      tags: ["reading", `reading:${slug}`],
    }),
);

export const fetchBookingPagePublished = cache(async (): Promise<SanityBookingPage | null> =>
  publishedFetch<SanityBookingPage | null>({ query: bookingPageQuery, tags: ["bookingPage"] }));

export const fetchBookingFormPublished = cache(async (): Promise<SanityBookingForm | null> =>
  publishedFetch<SanityBookingForm | null>({ query: bookingFormQuery, tags: ["bookingForm"] }));
