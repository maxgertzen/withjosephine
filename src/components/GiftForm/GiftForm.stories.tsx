import {
  GIFT_FORM_AKASHIC_RECORD_ARGS,
  GIFT_FORM_BIRTH_CHART_ARGS,
  GIFT_FORM_CUSTOM_COPY_ARGS,
  GIFT_FORM_SOUL_BLUEPRINT_ARGS,
  GIFT_FORM_STORY_BASE_ARGS,
} from "@story-fixtures/pages/giftForm";
import type { Meta, StoryObj } from "@storybook/react";

import { withBookingPageShell } from "../../../.storybook/decorators/BookingPageShell";
import { GiftForm } from "./GiftForm";

const meta: Meta<typeof GiftForm> = {
  title: "Pages/GiftForm",
  component: GiftForm,
  decorators: [withBookingPageShell],
  parameters: {
    layout: "fullscreen",
    bookingPageShell: {
      backHref: "/book/soul-blueprint/letter",
    },
  },
  args: GIFT_FORM_STORY_BASE_ARGS,
};
export default meta;

type Story = StoryObj<typeof GiftForm>;

export const SoulBlueprint: Story = {
  args: GIFT_FORM_SOUL_BLUEPRINT_ARGS,
};

export const BirthChart: Story = {
  args: GIFT_FORM_BIRTH_CHART_ARGS,
};

export const AkashicRecord: Story = {
  args: GIFT_FORM_AKASHIC_RECORD_ARGS,
};

export const CustomCopy: Story = {
  args: GIFT_FORM_CUSTOM_COPY_ARGS,
};
