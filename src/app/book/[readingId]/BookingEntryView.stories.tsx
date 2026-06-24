import {
  BOOKING_ENTRY_AKASHIC_READING,
  BOOKING_ENTRY_BASE_COPY,
  BOOKING_ENTRY_SOUL_BLUEPRINT_READING,
} from "@story-fixtures/pages/bookingEntry";
import type { Meta, StoryObj } from "@storybook/react";

import { BookingEntryView } from "./BookingEntryView";

const meta: Meta<typeof BookingEntryView> = {
  title: "Pages/BookingEntry",
  component: BookingEntryView,
  parameters: { layout: "fullscreen" },
  args: {
    reading: BOOKING_ENTRY_SOUL_BLUEPRINT_READING,
    copy: BOOKING_ENTRY_BASE_COPY,
  },
};
export default meta;

type Story = StoryObj<typeof BookingEntryView>;

export const SoulBlueprint: Story = {};

export const AkashicRecord: Story = {
  args: { reading: BOOKING_ENTRY_AKASHIC_READING },
};
