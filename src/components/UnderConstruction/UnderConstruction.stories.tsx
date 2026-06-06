import type { Meta, StoryObj } from "@storybook/react";

import { UNDER_CONSTRUCTION_PAGE_DEFAULTS } from "@/data/defaults";

import { UnderConstruction } from "./UnderConstruction";

const meta: Meta<typeof UnderConstruction> = {
  title: "Pages/UnderConstruction",
  component: UnderConstruction,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof UnderConstruction>;

export const Default: Story = {
  args: { content: UNDER_CONSTRUCTION_PAGE_DEFAULTS },
};

export const CustomCopy: Story = {
  args: {
    content: {
      tag: "✦ A New Chapter",
      heading: "Coming soon",
      description:
        "A few finishing touches and the site opens to everyone. Drop a note if you want to be the first to know.",
      imageUrl: undefined,
      imageAlt: "Mystical gathering around a pyramid of light",
      contactText: "In the meantime, reach me at",
    },
  },
};
