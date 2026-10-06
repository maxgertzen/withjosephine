import {
  deriveGiftThankYouViewProps,
  type GiftThankYouSource,
} from "@/app/(authed)/thank-you/[readingId]/deriveGiftThankYouViewProps";
import { PREVIEW_GIFT } from "@/lib/emails/preview-fixtures";
import type { SanityGiftSettings } from "@/lib/sanity/types";

export const SHOWN_GIFT = {
  buyerFirstName: PREVIEW_GIFT.buyerFirstName,
  displayCode: PREVIEW_GIFT.code,
  giftUrl: PREVIEW_GIFT.giftUrl,
};

export const ACTIVE_GIFT = {
  kind: "active",
  ...SHOWN_GIFT,
  note: PREVIEW_GIFT.note,
  sendToken: "send-token",
  sendStatus: {
    state: "ready",
    buyerName: PREVIEW_GIFT.buyerFirstName,
    hasNote: true,
    recipientName: null,
  },
} satisfies GiftThankYouSource;

export function giftThankYouViewProps(
  gift: GiftThankYouSource,
  giftSettings: SanityGiftSettings | null = null,
) {
  return deriveGiftThankYouViewProps({
    gift,
    readingName: PREVIEW_GIFT.readingName,
    giftSettings,
  });
}
