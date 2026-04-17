import type { Meta, StoryObj } from "@storybook/react";

import { HowItWorks } from "./HowItWorks";

const meta: Meta<typeof HowItWorks> = {
  title: "Components/HowItWorks",
  component: HowItWorks,
};

export default meta;
type Story = StoryObj<typeof HowItWorks>;

export const Default: Story = {};

export const WithCustomSteps: Story = {
  args: {
    content: {
      sectionTag: "✦ How It Works",
      heading: "your journey",
      steps: [
        { title: "Step One", description: "Select the reading that resonates with you." },
        { title: "Step Two", description: "Share your birth details securely." },
        { title: "Step Three", description: "Receive your personalized reading within 7 days." },
        { title: "Step Four", description: "Integrate the insights into your daily life." },
      ],
    },
  },
};
