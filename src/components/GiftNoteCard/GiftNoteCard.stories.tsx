import type { Meta, StoryObj } from "@storybook/react";

import { goldLinkClasses } from "@/lib/textStyles";

import { GiftNoteCard } from "./GiftNoteCard";

const NOTE =
  "Happy birthday, love. I hope this gives you some of the clarity you've been looking for this year.";

const meta: Meta<typeof GiftNoteCard> = {
  title: "Components/Booking/GiftNoteCard",
  component: GiftNoteCard,
  decorators: [
    (Story) => (
      <div className="max-w-sm bg-j-ivory p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GiftNoteCard>;

export const BuyerSavedNote: Story = {
  args: {
    label: "Your note, from Dana",
    note: NOTE,
    foot: (
      <>
        <button type="button" className={goldLinkClasses}>
          Edit note
        </button>{" "}
        · They see it when they open the gift. You can change it until then.
      </>
    ),
  },
};

export const RecipientNote: Story = {
  args: {
    label: "A note from Dana",
    note: NOTE,
    foot: "This reading is already paid for.",
  },
};

export const NoNote: Story = {
  args: {
    label: "A note from Dana",
    note: null,
    foot: "This reading is already paid for.",
  },
};

export const NoBuyer: Story = {
  args: {
    label: "A reading, given",
    note: "Someone sent you this reading.",
    foot: "It’s already paid for.",
  },
};
