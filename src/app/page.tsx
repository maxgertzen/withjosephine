import type { Metadata } from "next";
import { draftMode, headers } from "next/headers";
import { Suspense } from "react";

import { UnderConstruction } from "@/components/UnderConstruction";
import { NONCE_HEADER } from "@/lib/constants";
import { isUnderConstruction } from "@/lib/featureFlags";
import {
  fetchFaqItems,
  fetchLandingPage,
  fetchReadings,
  fetchSiteSettings,
  fetchTestimonials,
  fetchUnderConstructionPage,
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
import { buildOpenGraph } from "@/lib/seoMetadata";

import { HomePageView } from "./HomePageView";

export async function generateMetadata(): Promise<Metadata> {
  const landingPage = await fetchLandingPage();
  const seo = landingPage?.seo;

  return {
    title: seo?.metaTitle ?? "Josephine — Soul Readings",
    description:
      seo?.metaDescription ??
      "Your soul has patterns. Your chart reveals them. Your records explain why.",
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    openGraph: buildOpenGraph(seo),
  };
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  );
}

async function LandingPageContent() {
  const { isEnabled: isDraftMode } = await draftMode();
  const headersList = await headers();
  const host = headersList.get("host");

  if (isUnderConstruction(host) && !isDraftMode) {
    const underConstructionContent = await fetchUnderConstructionPage();
    return <UnderConstruction content={underConstructionContent} />;
  }

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
