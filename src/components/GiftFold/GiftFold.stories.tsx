import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { GIFT_DEFAULTS, PAYMENT_BUTTON_TEXT_FALLBACK } from "@/data/defaults";
import { pick } from "@/lib/pick";

import { GiftFold } from "./GiftFold";
import { GIFT_FOLD_COPY_KEYS } from "./giftFoldCopy";

const meta: Meta<typeof GiftFold> = {
  title: "Components/Booking/GiftFold",
  component: GiftFold,
  args: {
    readingSlug: "birth-chart",
    copy: pick(GIFT_DEFAULTS, GIFT_FOLD_COPY_KEYS),
    giftSheet: {
      reading: { slug: "birth-chart", name: "Birth Chart Reading", price: "$89" },
      content: GIFT_DEFAULTS,
      paymentButtonText: PAYMENT_BUTTON_TEXT_FALLBACK,
      loadingStateCopy: "One moment - taking you to checkout.",
      endpoint: null,
    },
    redeemSheet: { readingSlug: "birth-chart", content: GIFT_DEFAULTS, endpoint: null },
  },
  decorators: [
    (Story) => (
      <div className="max-w-[375px] bg-j-ivory p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GiftFold>;

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: GIFT_DEFAULTS.giftRowLabel }));
  },
};

export const GiftSheetOpen: Story = {
  args: { initialSheet: "gift" },
  parameters: { layout: "fullscreen" },
};

export const RedeemSheetOpen: Story = {
  args: { initialSheet: "redeem" },
  parameters: { layout: "fullscreen" },
};
