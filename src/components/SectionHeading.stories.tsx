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
    tag: "Our Readings",
    heading: "Explore Your Soul's Blueprint",
    subheading:
      "Every reading is a conversation between your chart, your records, and the patterns your soul chose this lifetime.",
  },
};

export const WithoutTag: Story = {
  args: {
    heading: "Explore Your Soul's Blueprint",
    subheading:
      "Every reading is a conversation between your chart, your records, and the patterns your soul chose this lifetime.",
  },
};

export const LeftAligned: Story = {
  args: {
    tag: "Our Readings",
    heading: "Explore Your Soul's Blueprint",
    subheading:
      "Every reading is a conversation between your chart, your records, and the patterns your soul chose this lifetime.",
    align: "left",
  },
};
