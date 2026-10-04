import type { BookingFormViewProps } from "@/app/book/[readingId]/BookingFormView";
import {
  type BookingFormPerspective,
  loadBookingFormViewProps,
} from "@/app/book/[readingId]/loadBookingFormViewProps";
import type { GiftContent } from "@/data/defaults";
import { giftContent } from "@/lib/gift/giftContent";
import { resolveReadingSummary } from "@/lib/readingSummary";
import {
  fetchGiftSettings,
  fetchGiftSettingsPublished,
  fetchReading,
  fetchReadingPublished,
} from "@/lib/sanity/fetch";

import {
  deriveGiftBookingFormViewProps,
  type GiftBookingFormGift,
} from "./deriveGiftBookingFormViewProps";
import type { GiftMessageReading } from "./deriveGiftMessageViewProps";

export async function loadGiftContent(perspective: BookingFormPerspective): Promise<GiftContent> {
  const giftSettings =
    perspective === "preview" ? await fetchGiftSettings() : await fetchGiftSettingsPublished();
  return giftContent(giftSettings);
}

export async function loadGiftBookingFormViewProps(
  gift: GiftBookingFormGift & { readingSlug: string },
  perspective: BookingFormPerspective,
): Promise<BookingFormViewProps | null> {
  const [base, copy] = await Promise.all([
    loadBookingFormViewProps(gift.readingSlug, perspective),
    loadGiftContent(perspective),
  ]);
  return base && deriveGiftBookingFormViewProps(base, gift, copy);
}

export async function loadMessageReading(
  slug: string | null,
  perspective: BookingFormPerspective,
): Promise<GiftMessageReading | null> {
  if (!slug) return null;
  return resolveReadingSummary(
    slug,
    perspective === "preview" ? fetchReading : fetchReadingPublished,
  );
}
