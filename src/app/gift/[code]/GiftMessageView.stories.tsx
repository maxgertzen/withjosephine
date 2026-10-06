import type { Meta, StoryObj } from "@storybook/react";

import { GIFT_DEFAULTS } from "@/data/defaults";

import { deriveGiftMessageViewProps, type GiftMessageReading } from "./deriveGiftMessageViewProps";
import { GiftMessageView } from "./GiftMessageView";

const BIRTH_CHART: GiftMessageReading = {
  slug: "birth-chart",
  tag: "Astrology",
  name: "Birth Chart Reading",
  priceLabel: "$89",
};

const meta: Meta<typeof GiftMessageView> = {
  title: "Pages/GiftMessage",
  component: GiftMessageView,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof GiftMessageView>;

export const AlreadyOpened: Story = {
  args: deriveGiftMessageViewProps("already_opened", BIRTH_CHART, GIFT_DEFAULTS, {}),
};

export const NoLongerActive: Story = {
  args: deriveGiftMessageViewProps("no_longer_active", BIRTH_CHART, GIFT_DEFAULTS, {}),
};

export const NotFound: Story = {
  args: deriveGiftMessageViewProps("not_found", null, GIFT_DEFAULTS, {}),
};

export const RateLimited: Story = {
  args: deriveGiftMessageViewProps("rate_limited", null, GIFT_DEFAULTS, {}),
};
