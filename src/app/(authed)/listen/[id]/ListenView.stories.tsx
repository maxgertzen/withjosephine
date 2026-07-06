import {
  LISTEN_VIEW_ASSET_TROUBLE_STATE,
  LISTEN_VIEW_CHECK_EMAIL_STATE,
  LISTEN_VIEW_DELIVERED_GIFT_RECIPIENT_STATE,
  LISTEN_VIEW_DELIVERED_NO_THUMBNAIL_STATE,
  LISTEN_VIEW_DELIVERED_STATE,
  LISTEN_VIEW_EXPIRED_STATE,
  LISTEN_VIEW_RESTED_STATE,
  LISTEN_VIEW_SIGN_IN_STATE,
  LISTEN_VIEW_SUBMISSION_ID,
  LISTEN_VIEW_THROTTLED_STATE,
} from "@story-fixtures/pages/listen";
import type { Meta, StoryObj } from "@storybook/react";

import { LISTEN_PAGE_DEFAULTS } from "@/data/defaults";

import { ListenView } from "./ListenView";

const meta: Meta<typeof ListenView> = {
  title: "Pages/Listen",
  component: ListenView,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: `/listen/${LISTEN_VIEW_SUBMISSION_ID}`,
        segments: [["id", LISTEN_VIEW_SUBMISSION_ID]],
        query: {},
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ListenView>;

const baseArgs = {
  copy: LISTEN_PAGE_DEFAULTS,
};

export const SignIn: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_SIGN_IN_STATE },
};

export const CheckEmail: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_CHECK_EMAIL_STATE },
};

export const Rested: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_RESTED_STATE },
};

export const Throttled: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_THROTTLED_STATE },
};

export const AssetTrouble: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_ASSET_TROUBLE_STATE },
};

export const Delivered: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_DELIVERED_STATE },
};

export const DeliveredGiftRecipient: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_DELIVERED_GIFT_RECIPIENT_STATE },
};

export const DeliveredNoThumbnail: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_DELIVERED_NO_THUMBNAIL_STATE },
};

export const Expired: Story = {
  args: { ...baseArgs, state: LISTEN_VIEW_EXPIRED_STATE },
};
