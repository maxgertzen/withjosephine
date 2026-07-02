import type { Metadata } from "next";

import {
  deriveThankYouViewProps,
  type ResolvedThankYouContext,
} from "@/app/(authed)/thank-you/[readingId]/deriveThankYouViewProps";
import { ThankYouView } from "@/app/(authed)/thank-you/[readingId]/ThankYouView";
import { getReadingById } from "@/data/readings";
import { fetchReading, fetchSiteSettings, fetchThankYouPage } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: Thank You Page",
  robots: { index: false, follow: false },
};

type ThankYouPreviewProps = {
  params: Promise<{ slug: string }>;
};

function resolvePreviewReading(
  slug: string,
  sanityReading: Awaited<ReturnType<typeof fetchReading>>,
): ResolvedThankYouContext["reading"] {
  if (sanityReading) {
    return {
      name: sanityReading.name,
      price: sanityReading.priceDisplay,
      cents: sanityReading.price,
    };
  }
  const fallback = getReadingById(slug);
  if (fallback) {
    return { name: fallback.name, price: fallback.price, cents: null };
  }
  return { name: "Soul Reading", price: "", cents: null };
}

export default async function ThankYouPagePreview({ params }: ThankYouPreviewProps) {
  const { slug } = await params;

  const [sanityReading, thankYouPageContent, siteSettings] = await Promise.all([
    fetchReading(slug),
    fetchThankYouPage(),
    fetchSiteSettings(),
  ]);

  const reading = resolvePreviewReading(slug, sanityReading);

  const context: ResolvedThankYouContext = {
    reading,
    paidAmount: { cents: reading.cents, display: reading.price || null },
  };

  const viewProps = deriveThankYouViewProps({
    context,
    thankYouPageContent,
    siteSettings,
    slugForOverride: slug,
  });

  return <ThankYouView {...viewProps} />;
}
