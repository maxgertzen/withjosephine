import {
  INTAKE_FORM_AKASHIC_RECORD_ARGS,
  INTAKE_FORM_BIRTH_CHART_ARGS,
  INTAKE_FORM_REDEEM_MODE_ARGS,
  INTAKE_FORM_SOUL_BLUEPRINT_ARGS,
  INTAKE_FORM_STORY_BASE_ARGS,
} from "@story-fixtures/pages/intakeForm";
import type { Meta, StoryObj } from "@storybook/react";

import { withBookingPageShell } from "../../../.storybook/decorators/BookingPageShell";
import { IntakeForm } from "./IntakeForm";

const meta: Meta<typeof IntakeForm> = {
  title: "Pages/BookingIntake",
  component: IntakeForm,
  decorators: [withBookingPageShell],
  args: INTAKE_FORM_STORY_BASE_ARGS,
  parameters: {
    layout: "fullscreen",
    bookingPageShell: {
      title: "A few things, before we begin.",
      subtitle: "Take your time. The more honestly you write, the more your reading can hold.",
      backHref: "/#reading-soul-blueprint",
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/book/soul-blueprint",
        segments: [["readingId", "soul-blueprint"]],
        query: {},
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof IntakeForm>;

export const SoulBlueprint: Story = {
  args: INTAKE_FORM_SOUL_BLUEPRINT_ARGS,
};

export const AkashicRecord: Story = {
  args: INTAKE_FORM_AKASHIC_RECORD_ARGS,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/book/akashic-record",
        segments: [["readingId", "akashic-record"]],
        query: {},
      },
    },
  },
};

export const BirthChart: Story = {
  args: INTAKE_FORM_BIRTH_CHART_ARGS,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/book/birth-chart",
        segments: [["readingId", "birth-chart"]],
        query: {},
      },
    },
  },
};

export const RedeemMode: Story = {
  args: INTAKE_FORM_REDEEM_MODE_ARGS,
};
