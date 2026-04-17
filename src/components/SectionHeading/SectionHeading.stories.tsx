import type { Meta, StoryObj } from "@storybook/react";

import { SectionHeading } from "./SectionHeading";

const meta: Meta<typeof SectionHeading> = {
  title: "Components/SectionHeading",
  component: SectionHeading,
};

export default meta;
type Story = StoryObj<typeof SectionHeading>;

export const Default: Story = {
  args: {
    tag: "✦ Offerings",
    heading: "readings",
    subheading:
      "Each reading is created with care, entirely for you. Nothing is templated or generic.",
  },
};

export const WithoutTag: Story = {
  args: {
    heading: "who i am + what this is",
    subheading:
      "Each reading is created with care, entirely for you. Nothing is templated or generic.",
  },
};

export const AsH1: Story = {
  args: {
    tag: "✦ Welcome",
    heading: "readings",
    as: "h1",
  },
};

export const AsH3: Story = {
  args: {
    heading: "subsection heading",
    as: "h3",
  },
};

export const LeftAligned: Story = {
  args: {
    tag: "✦ Process",
    heading: "how it works",
    subheading:
      "Each reading is created with care, entirely for you. Nothing is templated or generic.",
    align: "left",
  },
};
