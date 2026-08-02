import {
  BOOKING_FORM_AKASHIC_RECORD_ARGS,
  BOOKING_FORM_BIRTH_CHART_ARGS,
  BOOKING_FORM_SOUL_BLUEPRINT_ARGS,
} from "@story-fixtures/pages/bookingForm";
import type { Meta, StoryObj } from "@storybook/react";

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
