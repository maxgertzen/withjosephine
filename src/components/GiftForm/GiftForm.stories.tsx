import type { Meta, StoryObj } from "@storybook/react";

import { BOOKING_GIFT_FORM_DEFAULTS } from "@/data/defaults";

import { GiftForm } from "./GiftForm";

const meta: Meta<typeof GiftForm> = {
  title: "Pages/GiftForm",
  component: GiftForm,
  parameters: { layout: "fullscreen" },
  args: {
    readingSlug: "soul-blueprint",
    readingName: "Soul Blueprint",
    readingPriceDisplay: "$179",
    copy: BOOKING_GIFT_FORM_DEFAULTS,
  },
};
export default meta;

type Story = StoryObj<typeof GiftForm>;

export const SoulBlueprint: Story = {};

export const BirthChart: Story = {
  args: {
    readingSlug: "birth-chart",
    readingName: "Birth Chart Reading",
    readingPriceDisplay: "$99",
  },
};

export const AkashicRecord: Story = {
  args: {
    readingSlug: "akashic-record",
    readingName: "Akashic Record Reading",
    readingPriceDisplay: "$79",
  },
};

export const CustomCopy: Story = {
  args: {
    copy: {
      ...BOOKING_GIFT_FORM_DEFAULTS,
      heading: "Give the gift of a reading.",
      subheading: "A few details and it's on its way.",
      consentIntro: "By giving this gift, you confirm the following:",
      submitButtonSelfSend: "Send me the gift link",
      submitButtonScheduled: "Schedule the gift",
    },
  },
};
