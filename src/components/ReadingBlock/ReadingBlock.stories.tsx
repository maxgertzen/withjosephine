import type { Decorator, Meta, StoryObj } from "@storybook/react";

import type { BookingEntry } from "@/lib/analytics";
import { BookingEntryContext } from "@/lib/intake/bookingEntryContext";

import { ReadingBlock } from "./ReadingBlock";
import { SOUL_BLUEPRINT_BLOCK } from "./readingBlockFixture";

function visitorFrom(entry: BookingEntry): Decorator {
  return function VisitorFrom(Story) {
    return (
      <BookingEntryContext.Provider value={entry}>
        <Story />
      </BookingEntryContext.Provider>
    );
  };
}

const meta: Meta<typeof ReadingBlock> = {
  title: "Components/Booking/ReadingBlock",
  component: ReadingBlock,
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

type Story = StoryObj<typeof ReadingBlock>;

export const OpenForSearchVisitor: Story = { decorators: [visitorFrom("external")] };

export const FoldedForHomepageCardVisitor: Story = { decorators: [visitorFrom("homepage_card")] };

export const FoldedForSavedDraft: Story = { decorators: [visitorFrom("draft")] };

export const WithoutQuestions: Story = {
  decorators: [visitorFrom("external")],
  args: { questions: { title: "Questions", items: [] } },
};

export const WithoutReaderPhoto: Story = {
  decorators: [visitorFrom("external")],
  args: { reader: { ...SOUL_BLUEPRINT_BLOCK.reader, imageUrl: undefined } },
};

const SIX_FACTS = [
  ...SOUL_BLUEPRINT_BLOCK.facts,
  { label: "Reader", value: "Josephine" },
  { label: "Language", value: "English" },
  { label: "Sent by", value: "Email" },
];

export const SixFactsBalanced: Story = {
  decorators: [visitorFrom("external")],
  args: { facts: SIX_FACTS },
};

export const FiveFactsListOnPhones: Story = {
  decorators: [visitorFrom("external")],
  args: {
    facts: SIX_FACTS.slice(0, 5),
    factsLayout: { ...SOUL_BLUEPRINT_BLOCK.factsLayout, factsListOnPhones: true },
  },
};

export const FactsHidden: Story = { decorators: [visitorFrom("external")], args: { facts: [] } };
