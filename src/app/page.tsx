import type { Metadata } from "next";

import {
  fetchFaqItemsPublished,
  fetchLandingPagePublished,
  fetchReadingsPublished,
  fetchSiteSettingsPublished,
  fetchTestimonialsPublished,
} from "@/lib/sanity/fetch";
import { buildOpenGraph } from "@/lib/seoMetadata";

import { HomePageView } from "./HomePageView";
import { toHomePageViewProps } from "./homePageViewProps";

export async function generateMetadata(): Promise<Metadata> {
  const landingPage = await fetchLandingPagePublished();
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
    alternates: { canonical: "/" },
    openGraph: buildOpenGraph(seo),
  };
}

export default async function LandingPage() {
  const [landingPage, readings, testimonials, faqItems, siteSettings] = await Promise.all([
    fetchLandingPagePublished(),
    fetchReadingsPublished(),
    fetchTestimonialsPublished(),
    fetchFaqItemsPublished(),
    fetchSiteSettingsPublished(),
  ]);

  return (
    <HomePageView
      {...toHomePageViewProps({
        landingPage,
        readings,
        testimonials,
        faqItems,
        siteSettings,
      })}
    />
  );
}
