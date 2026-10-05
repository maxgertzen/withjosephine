import type { Meta, StoryObj } from "@storybook/react";

import { READINGS_SECTION_DEFAULTS } from "@/data/defaults";
import { mapReadings } from "@/lib/sanity/mappers";

import { ReadingCard } from "./ReadingCard";
import { readingCardProps } from "./readingCardProps";

const meta: Meta<typeof ReadingCard> = {
  title: "Components/Content/ReadingCard",
  component: ReadingCard,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "warm",
      values: [{ name: "warm", value: "#F5F0E8" }],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ReadingCard>;

const soulBlueprintData = readingCardProps(mapReadings([])[0], READINGS_SECTION_DEFAULTS);

export const Default: Story = {
  args: {
    ...soulBlueprintData,
  },
};

export const InGrid: Story = {
  args: {
    ...soulBlueprintData,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};
