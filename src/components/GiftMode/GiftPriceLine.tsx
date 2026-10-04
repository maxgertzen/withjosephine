"use client";

import { ReadingPrice } from "@/components/BookingPageShell/ReadingTitleBlock";

import { useGiftMode } from "./GiftModeContext";

type GiftPriceLineProps = {
  giftLabel: string;
  readingPrice: string;
};

export function GiftPriceLine({ giftLabel, readingPrice }: GiftPriceLineProps) {
  const { active } = useGiftMode();
  return active ? (
    <ReadingPrice label={giftLabel} tone="gift" />
  ) : (
    <ReadingPrice label={readingPrice} />
  );
}
