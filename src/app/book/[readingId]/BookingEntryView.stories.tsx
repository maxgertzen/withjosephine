import type { Meta, StoryObj } from "@storybook/react";

import {
  type BookingEntryCopy,
  type BookingEntryReading,
  BookingEntryView,
} from "./BookingEntryView";

const baseCopy: BookingEntryCopy = {
  changeReadingLinkText: "Change reading",
  deliveryNote: "Within 7 days.",
  deliverableNote:
    "Detailed voice note recording + a supporting PDF created entirely for you.",
  whatsIncludedHeading: "What's included",
  bookReadingCtaText: "Begin",
  giftToggleAsGiftLabel: "Gift this reading",
};

const soulBlueprint: BookingEntryReading = {
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

const akashic: BookingEntryReading = {
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

const meta: Meta<typeof BookingEntryView> = {
  title: "Pages/BookingEntryView",
  component: BookingEntryView,
  parameters: { layout: "fullscreen" },
  args: {
    reading: soulBlueprint,
    copy: baseCopy,
    aboutJosephineLinkText: "About Josephine",
  },
};
export default meta;

type Story = StoryObj<typeof BookingEntryView>;

export const SoulBlueprint: Story = {};

export const AkashicRecord: Story = {
  args: { reading: akashic },
};
