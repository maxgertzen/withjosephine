import {
  BOOKING_FORM_AKASHIC_RECORD_ARGS,
  BOOKING_FORM_BIRTH_CHART_ARGS,
  BOOKING_FORM_SOUL_BLUEPRINT_ARGS,
} from "@story-fixtures/pages/bookingForm";
import type { Meta, StoryObj } from "@storybook/react";

import { deriveGiftBookingFormViewProps } from "@/app/gift/[code]/deriveGiftBookingFormViewProps";
import { GIFT_DEFAULTS } from "@/data/defaults";

import { BookingFormView } from "./BookingFormView";

const meta: Meta<typeof BookingFormView> = {
  title: "Pages/BookingForm",
  component: BookingFormView,
  parameters: { layout: "fullscreen" },
  args: BOOKING_FORM_SOUL_BLUEPRINT_ARGS,
};
export default meta;

type Story = StoryObj<typeof BookingFormView>;

export const SoulBlueprint: Story = {};

export const BirthChart: Story = { args: BOOKING_FORM_BIRTH_CHART_ARGS };

export const AkashicRecord: Story = { args: BOOKING_FORM_AKASHIC_RECORD_ARGS };

export const LongestReadingName: Story = {
  args: {
    ...BOOKING_FORM_AKASHIC_RECORD_ARGS,
    reading: { ...BOOKING_FORM_AKASHIC_RECORD_ARGS.reading, name: "The Akashic Record Reading" },
  },
};

export const Gift: Story = {
  args: deriveGiftBookingFormViewProps(
    BOOKING_FORM_BIRTH_CHART_ARGS,
    {
      code: "K7M2QX9PH4TR",
      buyerFirstName: "Dana",
      note: "Happy birthday, Anna. I hope this gives you something to hold on to this year.",
    },
    GIFT_DEFAULTS,
  ),
};

export const GiftWithoutBuyer: Story = {
  args: deriveGiftBookingFormViewProps(
    BOOKING_FORM_BIRTH_CHART_ARGS,
    { code: "K7M2QX9PH4TR", buyerFirstName: "", note: null },
    GIFT_DEFAULTS,
  ),
};
