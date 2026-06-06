import {
  GIFT_INTAKE_BASE_ARGS,
  GIFT_INTAKE_WELCOME_ARRIVAL_HEADING,
} from "@story-fixtures/pages/giftIntake";
import type { Meta, StoryObj } from "@storybook/react";

import { GiftIntakeView } from "./GiftIntakeView";

const meta: Meta<typeof GiftIntakeView> = {
  title: "Pages/GiftIntakeView",
  component: GiftIntakeView,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/gift/intake",
        query: {},
      },
    },
  },
  args: GIFT_INTAKE_BASE_ARGS,
};
export default meta;

type Story = StoryObj<typeof GiftIntakeView>;

export const ReturnVisit: Story = {};

export const WelcomeArrival: Story = {
  args: {
    heading: GIFT_INTAKE_WELCOME_ARRIVAL_HEADING,
  },
};

export const NoRecipientEmail: Story = {
  args: {
    recipientEmail: null,
  },
};
