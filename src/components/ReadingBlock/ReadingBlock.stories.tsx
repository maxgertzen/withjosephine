import type { Meta, StoryObj } from "@storybook/react";

import { SOUL_BLUEPRINT_BLOCK } from "./readingBlockFixture";
import { ReadingBlockPreview } from "./ReadingBlockPreview";

const meta: Meta<typeof ReadingBlockPreview> = {
  title: "Components/Booking/ReadingBlock",
  component: ReadingBlockPreview,
  args: SOUL_BLUEPRINT_BLOCK,
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-j-ivory p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ReadingBlockPreview>;

export const Default: Story = {};

export const WithoutQuestions: Story = {
  args: { questions: { title: "Questions", items: [] } },
};

export const WithoutReaderPhoto: Story = {
  args: { reader: { ...SOUL_BLUEPRINT_BLOCK.reader, imageUrl: undefined } },
};

const SIX_FACTS = [
  ...SOUL_BLUEPRINT_BLOCK.facts,
  { label: "Reader", value: "Josephine" },
  { label: "Language", value: "English" },
  { label: "Sent by", value: "Email" },
];

export const SixFactsBalanced: Story = {
  args: { facts: SIX_FACTS },
};

export const FiveFactsListOnPhones: Story = {
  args: {
    facts: SIX_FACTS.slice(0, 5),
    factsLayout: { ...SOUL_BLUEPRINT_BLOCK.factsLayout, factsListOnPhones: true },
  },
};

export const FactsHidden: Story = { args: { facts: [] } };
