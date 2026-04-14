import type { Meta, StoryObj } from "@storybook/react";
import { ReadingCard } from "./ReadingCard";

const meta: Meta<typeof ReadingCard> = {
  title: "Components/ReadingCard",
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

const soulBlueprintData = {
  tag: "Signature",
  name: "The Soul Blueprint",
  price: "$179",
  valueProposition:
    "The most complete picture of your soul I can give you",
  briefDescription:
    "My signature offering combining your birth chart, Akashic Records and card pulls to reveal your purpose, past lives, and ancestral patterns.",
  expandedDetails: [
    "This weaves together three powerful modalities to create the deepest understanding of who you are.",
    "You'll receive a detailed birth chart analysis covering your core themes, gifts, and patterns.",
    "Your Akashic Records are opened to reveal past lives and ancestral connections.",
    "Includes personalised card pulls that speak directly to your current path.",
    "Delivered as a detailed voice note recording plus a supporting PDF created entirely for you.",
  ],
  href: "/book/soul-blueprint",
};

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
