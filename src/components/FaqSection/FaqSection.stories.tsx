import type { Meta, StoryObj } from "@storybook/react";

import { FaqSection } from "./FaqSection";

const meta: Meta<typeof FaqSection> = {
  title: "Components/FaqSection",
  component: FaqSection,
};

export default meta;
type Story = StoryObj<typeof FaqSection>;

export const Default: Story = {
  args: {
    items: [
      { id: "1", question: "How long does a reading take?", answer: "You'll receive your reading within 7 days of booking." },
      { id: "2", question: "What do I need to provide?", answer: "Your date, time, and place of birth for chart-based readings." },
      { id: "3", question: "Can I ask follow-up questions?", answer: "Absolutely — reach out via the contact form after receiving your reading." },
    ],
  },
};

export const SingleItem: Story = {
  args: {
    items: [
      { id: "1", question: "Is this a one-time purchase?", answer: "Yes, each reading is a one-time purchase with no subscription required." },
    ],
  },
};
