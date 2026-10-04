import type { Meta, StoryObj } from "@storybook/react";

import { GIFT_DEFAULTS } from "@/data/defaults";

import { GiftSendPageView } from "./GiftSendPageView";

const meta: Meta<typeof GiftSendPageView> = {
  title: "Pages/GiftSend",
  component: GiftSendPageView,
  parameters: { layout: "fullscreen" },
  args: { copy: GIFT_DEFAULTS, token: "story-token", status: null },
};
export default meta;

type Story = StoryObj<typeof GiftSendPageView>;

export const Loading: Story = {};

export const Ready: Story = {
  args: { status: { state: "ready", buyerName: "Dana", hasNote: true, recipientName: null } },
};

export const ReadyAfterFailedSend: Story = {
  args: { status: { state: "ready", buyerName: "Dana", hasNote: true, recipientName: "Anna" } },
};
