import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { ReadingCard } from "@/components/ReadingCard";
import { BookingEntryContext } from "@/lib/intake/bookingEntryContext";

import { ReadingBlock } from "./ReadingBlock";
import { fieldMapBlockProps, fieldMapCardProps } from "./sanityFieldMapFixture";

const meta: Meta = {
  title: "Sanity field map",
  parameters: {
    docs: {
      description: {
        component:
          "Every visible text shows the Studio place, Studio title and field that feeds it, run through the same mapping code as the live pages.",
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const CARD = fieldMapCardProps();
const BLOCK = fieldMapBlockProps();

export const HomepageReadingCard: Story = {
  render: () => (
    <div className="max-w-xl bg-j-warm p-6">
      <ReadingCard {...CARD} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: CARD.labels.learnMoreLabel }));
  },
};

export const BookingPageReadingBlock: Story = {
  render: () => (
    <BookingEntryContext.Provider value="external">
      <div className="max-w-3xl bg-j-ivory p-6">
        <ReadingBlock {...BLOCK} />
      </div>
    </BookingEntryContext.Provider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: BLOCK.included.title }));
    await userEvent.click(canvas.getByRole("button", { name: BLOCK.howItWorks.title }));
  },
};
