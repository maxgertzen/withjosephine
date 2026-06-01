import type { Meta, StoryObj } from "@storybook/react";

import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import type { SanityFormSection, SanityPagination } from "@/lib/sanity/types";

import bookingFormFixture from "../../__fixtures__/sanity/e2e/bookingForm.json";
import { IntakeForm } from "./IntakeForm";

const sections = bookingFormFixture.sections as unknown as SanityFormSection[];
const pagination = bookingFormFixture.pagination as SanityPagination;

const baseArgs = {
  sections,
  pagination,
  readingId: "soul-blueprint",
  readingName: "Soul Blueprint",
  nonRefundableNotice: bookingFormFixture.nonRefundableNotice ?? "",
  loadingStateCopy: bookingFormFixture.loadingStateCopy ?? "",
  pageIndicatorTagline: bookingFormFixture.pageIndicatorTagline ?? "",
  nextLabel: bookingFormFixture.nextButtonText ?? "Next",
  saveLaterLabel: bookingFormFixture.saveAndContinueLaterText ?? "Save & continue later",
  submitLabel: "Continue to payment",
};

const meta: Meta<typeof IntakeForm> = {
  title: "Pages/IntakeForm",
  component: IntakeForm,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/book/soul-blueprint/intake",
        segments: [["readingId", "soul-blueprint"]],
        query: {},
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof IntakeForm>;

export const SoulBlueprint: Story = {
  args: {
    ...baseArgs,
    sections: filterSectionsForReading(sections, "soul-blueprint"),
    readingId: "soul-blueprint",
    readingName: "Soul Blueprint",
  },
};

export const AkashicRecord: Story = {
  args: {
    ...baseArgs,
    sections: filterSectionsForReading(sections, "akashic-record"),
    readingId: "akashic-record",
    readingName: "Akashic Record Reading",
  },
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/book/akashic-record/intake",
        segments: [["readingId", "akashic-record"]],
        query: {},
      },
    },
  },
};

export const BirthChart: Story = {
  args: {
    ...baseArgs,
    sections: filterSectionsForReading(sections, "birth-chart"),
    readingId: "birth-chart",
    readingName: "Birth Chart Reading",
  },
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/book/birth-chart/intake",
        segments: [["readingId", "birth-chart"]],
        query: {},
      },
    },
  },
};

export const RedeemMode: Story = {
  args: {
    ...baseArgs,
    sections: filterSectionsForReading(sections, "soul-blueprint"),
    mode: "redeem",
    redeemSubmissionId: "sub_storybook_redeem",
    prefilledEmail: "recipient@example.com",
    submitLabel: "Submit intake",
  },
};
