import type {
  BookingEntryCopy,
  BookingEntryReading,
} from "@/app/book/[readingId]/BookingEntryView";

export const BOOKING_ENTRY_BASE_COPY: BookingEntryCopy = {
  changeReadingLinkText: "Change reading",
  deliveryNote: "Within 7 days.",
  deliverableNote:
    "Detailed voice note recording + a supporting PDF created entirely for you.",
  whatsIncludedHeading: "What's included",
  bookReadingCtaText: "Begin",
  giftToggleAsGiftLabel: "Gift this reading",
};

export const BOOKING_ENTRY_SOUL_BLUEPRINT_READING: BookingEntryReading = {
  slug: "soul-blueprint",
  tag: "Signature",
  name: "The Soul Blueprint",
  priceLabel: "$179",
  shortDescription:
    "The complete picture. Your full chart, your records, and the patterns running underneath both.",
  includedItems: [
    "A detailed voice-note reading",
    "A supporting PDF, written entirely for you",
    "Two weeks of follow-up questions",
  ],
};

export const BOOKING_ENTRY_AKASHIC_READING: BookingEntryReading = {
  slug: "akashic-record",
  tag: "Reading",
  name: "Akashic Record Reading",
  priceLabel: "$79",
  shortDescription:
    "The why beneath the chart. Records of your soul's history, in plain language.",
  includedItems: [
    "A detailed voice-note reading",
    "A supporting PDF, written entirely for you",
  ],
};
