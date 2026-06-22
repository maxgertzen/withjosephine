import type { Metadata } from "next";
import { draftMode, headers } from "next/headers";

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
import { buildOpenGraph } from "@/lib/seoMetadata";

import { HomePageView } from "./HomePageView";
import { toHomePageViewProps } from "./homePageViewProps";

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

export default async function LandingPage() {
  const { isEnabled: isDraftMode } = await draftMode();
  const headersList = await headers();
  const host = headersList.get("host");

  if (isUnderConstruction(host) && !isDraftMode) {
    const underConstructionContent = await fetchUnderConstructionPage();
    return <UnderConstruction content={underConstructionContent} />;
  }

  const [landingPage, readings, testimonials, faqItems, siteSettings] = await Promise.all([
    fetchLandingPage(),
    fetchReadings(),
    fetchTestimonials(),
    fetchFaqItems(),
    fetchSiteSettings(),
  ]);

  return (
    <HomePageView
      {...toHomePageViewProps({
        landingPage,
        readings,
        testimonials,
        faqItems,
        siteSettings,
        faqNonce: headersList.get(NONCE_HEADER) ?? undefined,
      })}
    />
  );
}
