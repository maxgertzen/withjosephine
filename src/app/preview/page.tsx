import type { Metadata } from "next";
import { headers } from "next/headers";

import { NONCE_HEADER } from "@/lib/constants";
import {
  fetchFaqItems,
  fetchLandingPage,
  fetchNotesState,
  fetchReadings,
  fetchSiteSettings,
  fetchTestimonials,
} from "@/lib/sanity/fetch";

import { HomePageView } from "../HomePageView";
import { toHomePageViewProps } from "../homePageViewProps";

export const metadata: Metadata = {
  title: "Preview: Landing Page",
  robots: { index: false, follow: false },
};

export default async function LandingPagePreview() {
  const headersList = await headers();

  const [landingPage, readings, testimonials, faqItems, siteSettings, notesState] =
    await Promise.all([
      fetchLandingPage(),
      fetchReadings(),
      fetchTestimonials(),
      fetchFaqItems(),
      fetchSiteSettings(),
      fetchNotesState(),
    ]);

  return (
    <HomePageView
      {...toHomePageViewProps({
        landingPage,
        readings,
        testimonials,
        faqItems,
        siteSettings,
        notesState,
        faqNonce: headersList.get(NONCE_HEADER) ?? undefined,
      })}
    />
  );
}
