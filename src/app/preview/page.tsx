import type { Metadata } from "next";
import { headers } from "next/headers";

import { NONCE_HEADER } from "@/lib/constants";
import {
  fetchFaqItems,
  fetchLandingPage,
  fetchReadings,
  fetchSiteSettings,
  fetchTestimonials,
} from "@/lib/sanity/fetch";
import {
  mapAbout,
  mapFaqItems,
  mapFooterContent,
  mapNavContent,
  mapReadings,
  mapSocialLinks,
  mapTestimonials,
} from "@/lib/sanity/mappers";

import { HomePageView } from "../HomePageView";

export const metadata: Metadata = {
  title: "Preview — Landing Page",
  robots: { index: false, follow: false },
};

export default async function LandingPagePreview() {
  const headersList = await headers();

  const [landingPage, sanityReadings, sanityTestimonials, sanityFaqItems, siteSettings] =
    await Promise.all([
      fetchLandingPage(),
      fetchReadings(),
      fetchTestimonials(),
      fetchFaqItems(),
      fetchSiteSettings(),
    ]);

  return (
    <HomePageView
      navContent={mapNavContent(siteSettings)}
      footerContent={mapFooterContent(siteSettings)}
      socialLinks={mapSocialLinks(siteSettings)}
      about={mapAbout(landingPage)}
      readings={mapReadings(sanityReadings)}
      testimonials={mapTestimonials(sanityTestimonials)}
      faqItems={mapFaqItems(sanityFaqItems)}
      faqNonce={headersList.get(NONCE_HEADER) ?? undefined}
      hero={landingPage?.hero ?? undefined}
      howItWorks={landingPage?.howItWorks ?? undefined}
      readingsSection={landingPage?.readingsSection ?? undefined}
      testimonialsSection={landingPage?.testimonialsSection ?? undefined}
      contactSection={landingPage?.contactSection ?? undefined}
    />
  );
}
