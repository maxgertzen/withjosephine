import {
  THANK_YOU_BASE_COPY,
  THANK_YOU_GIFT_PURCHASER_COPY,
  THANK_YOU_GIFT_PURCHASER_SELF_SEND_COPY,
  THANK_YOU_GIFT_RECIPIENT_COPY,
  THANK_YOU_READING,
} from "@story-fixtures/pages/thankYou";
import type { Meta, StoryObj } from "@storybook/react";

import { ThankYouView } from "./ThankYouView";

const meta: Meta<typeof ThankYouView> = {
  title: "Pages/ThankYouView",
  component: ThankYouView,
  parameters: { layout: "fullscreen" },
  args: {
    mode: "purchase",
    reading: THANK_YOU_READING,
    paidAmount: { cents: 17900, display: "$179.00" },
    purchaserFirstName: null,
    recipientName: null,
    contactEmail: "hello@withjosephine.com",
    copy: THANK_YOU_BASE_COPY,
  },
};
export default meta;

type Story = StoryObj<typeof ThankYouView>;

export const SelfPurchase: Story = {};

export const SelfPurchaseDiscounted: Story = {
  args: {
    paidAmount: { cents: 9900, display: "$99.00" },
  },
};

export const GiftPurchaserScheduled: Story = {
  args: {
    mode: "giftPurchaser",
    purchaserFirstName: "Sarah",
    recipientName: "Mira",
    copy: THANK_YOU_GIFT_PURCHASER_COPY,
  },
};

export const GiftPurchaserSelfSend: Story = {
  args: {
    mode: "giftPurchaser",
    purchaserFirstName: "Sarah",
    copy: THANK_YOU_GIFT_PURCHASER_SELF_SEND_COPY,
  },
};

export const GiftPurchaserNoName: Story = {
  args: {
    mode: "giftPurchaser",
    purchaserFirstName: null,
    recipientName: "Mira",
    copy: THANK_YOU_GIFT_PURCHASER_COPY,
  },
};

export const GiftRecipient: Story = {
  args: {
    mode: "giftRecipient",
    paidAmount: { cents: null, display: null },
    recipientName: "Mira",
    copy: THANK_YOU_GIFT_RECIPIENT_COPY,
  },
};
