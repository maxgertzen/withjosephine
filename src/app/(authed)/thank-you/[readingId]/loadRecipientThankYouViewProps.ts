import { notFound, redirect } from "next/navigation";

import type { GiftRecipientThankYou } from "@/lib/booking/submissions";
import { giftContent } from "@/lib/gift/giftContent";
import { resolveReadingSummary } from "@/lib/readingSummary";
import {
  fetchGiftSettings,
  fetchReading,
  fetchSiteSettings,
  fetchThankYouPage,
} from "@/lib/sanity/fetch";

import { deriveThankYouViewProps } from "./deriveThankYouViewProps";
import type { ThankYouViewProps } from "./ThankYouView";

export async function loadRecipientThankYouViewProps(
  recipient: Promise<GiftRecipientThankYou | null>,
): Promise<ThankYouViewProps> {
  const [found, thankYouPageContent, siteSettings, giftSettings] = await Promise.all([
    recipient,
    fetchThankYouPage(),
    fetchSiteSettings(),
    fetchGiftSettings(),
  ]);
  if (!found) redirect("/");

  const readingName =
    found.readingName ?? (await resolveReadingSummary(found.readingSlug, fetchReading))?.name;
  if (!readingName) notFound();

  return deriveThankYouViewProps({
    context: {
      reading: { name: readingName, price: null, cents: null },
      paidAmount: { cents: null, display: null },
    },
    thankYouPageContent,
    siteSettings,
    slugForOverride: found.readingSlug,
    gift: {
      recipientName: found.recipientFirstName,
      buyerFirstName: found.buyerFirstName,
      giftCopy: giftContent(giftSettings),
    },
  });
}
