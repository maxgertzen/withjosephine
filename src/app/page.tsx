import type { Metadata } from "next";

import { JsonLd } from "@/components/JsonLd/JsonLd";
import {
  fetchFaqItemsPublished,
  fetchLandingPagePublished,
  fetchReadingsPublished,
  fetchSiteSettingsPublished,
  fetchTestimonialsPublished,
} from "@/lib/sanity/fetch";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structuredData";

import { HomePageView } from "./HomePageView";
import { toHomePageViewProps } from "./homePageViewProps";

export async function generateMetadata(): Promise<Metadata> {
  const landingPage = await fetchLandingPagePublished();
  const seo = landingPage?.seo;

  const title = seo?.metaTitle ?? "Josephine — Soul Readings";
  const description =
    seo?.metaDescription ??
    "Your soul has patterns. Your chart reveals them. Your records explain why.";

  return {
    ...buildPageMetadata({ title, description, path: "/", seo }),
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
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

  const sameAs = siteSettings?.socialLinks?.map((link) => link.url) ?? [];
  const brandName = siteSettings?.brandName;

  return (
    <>
      <JsonLd data={organizationJsonLd({ name: brandName, sameAs })} />
      <JsonLd data={websiteJsonLd(brandName)} />
      <HomePageView
        {...toHomePageViewProps({
          landingPage,
          readings,
          testimonials,
          faqItems,
          siteSettings,
        })}
      />
    </>
  );
}
