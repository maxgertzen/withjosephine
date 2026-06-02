import type { Meta, StoryObj } from "@storybook/react";

import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import type { SanityFormSection, SanityPagination } from "@/lib/sanity/types";

import bookingFormFixture from "../../../../__fixtures__/sanity/e2e/bookingForm.json";
import { GiftIntakeView } from "./GiftIntakeView";

const sections = bookingFormFixture.sections as unknown as SanityFormSection[];
const pagination = bookingFormFixture.pagination as SanityPagination;

const SUBMISSION_ID = "sub_storybook_gift_redeem";

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
  args: {
    submissionId: SUBMISSION_ID,
    recipientEmail: "recipient@example.com",
    eyebrow: "✦ Opening your gift",
    heading: "Let’s open your gift.",
    lede: "Someone sent you a Soul Blueprint. Share your details and Josephine will prepare your reading.",
    readingSlug: "soul-blueprint",
    readingName: "Soul Blueprint",
    sections: filterSectionsForReading(sections, "soul-blueprint"),
    pagination,
    formLabels: {
      nextLabel: bookingFormFixture.nextButtonText ?? "Next",
      saveLaterLabel: bookingFormFixture.saveAndContinueLaterText ?? "Save & continue later",
      pageIndicatorTagline: bookingFormFixture.pageIndicatorTagline ?? "",
    },
  },
};
export default meta;

type Story = StoryObj<typeof GiftIntakeView>;

export const ReturnVisit: Story = {};

export const WelcomeArrival: Story = {
  args: {
    heading: "Welcome. Let’s open your gift.",
  },
};

export const NoRecipientEmail: Story = {
  args: {
    recipientEmail: null,
  },
};
