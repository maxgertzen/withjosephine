import type { BookingFormViewProps } from "@/app/book/[readingId]/BookingFormView";
import { loadBookingFormViewProps } from "@/app/book/[readingId]/loadBookingFormViewProps";
import type { GiftContent } from "@/data/defaults";
import { readingPageContent } from "@/lib/booking/readingPageContent";
import { giftContent } from "@/lib/gift/giftContent";
import { loadSiteChrome } from "@/lib/notes/loadSiteChrome";
import { resolveReadingSummary } from "@/lib/readingSummary";
import {
  fetchBookingForm,
  fetchBookingFormPublished,
  fetchGiftSettings,
  fetchGiftSettingsPublished,
  fetchReading,
  fetchReadingPublished,
} from "@/lib/sanity/fetch";
import type { ContentPerspective } from "@/lib/sanity/types";

import {
  deriveGiftBookingFormViewProps,
  type GiftBookingFormGift,
} from "./deriveGiftBookingFormViewProps";
import type { GiftMessageReading, GiftMessageShell } from "./deriveGiftMessageViewProps";

export async function loadGiftContent(perspective: ContentPerspective): Promise<GiftContent> {
  const giftSettings =
    perspective === "preview" ? await fetchGiftSettings() : await fetchGiftSettingsPublished();
  return giftContent(giftSettings);
}

export async function loadGiftBookingFormViewProps(
  gift: GiftBookingFormGift & { readingSlug: string },
  perspective: ContentPerspective,
): Promise<BookingFormViewProps | null> {
  const [base, copy] = await Promise.all([
    loadBookingFormViewProps(gift.readingSlug, perspective),
    loadGiftContent(perspective),
  ]);
  return base && deriveGiftBookingFormViewProps(base, gift, copy);
}

export async function loadMessageReading(
  slug: string | null,
  perspective: ContentPerspective,
): Promise<GiftMessageReading | null> {
  if (!slug) return null;
  return resolveReadingSummary(
    slug,
    perspective === "preview" ? fetchReading : fetchReadingPublished,
  );
}

export async function loadGiftMessageShell(perspective: ContentPerspective): Promise<GiftMessageShell> {
  const [chrome, bookingForm] = await Promise.all([
    loadSiteChrome(perspective),
    (perspective === "preview" ? fetchBookingForm() : fetchBookingFormPublished()).catch(() => null),
  ]);
  return { ...chrome, backLabel: readingPageContent(bookingForm).backLabel };
}
