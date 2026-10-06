import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/Button";
import { goldLinkClasses } from "@/lib/textStyles";

import { GiftMessageCard } from "./GiftMessageCard";

const meta: Meta<typeof GiftMessageCard> = {
  title: "Components/Booking/GiftMessageCard",
  component: GiftMessageCard,
  decorators: [
    (Story) => (
      <div className="max-w-sm bg-j-cream p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GiftMessageCard>;

export const WithButton: Story = {
  args: {
    heading: "This gift was already opened",
    body: "If you think this is a mistake, reply to the email your gift came in, or write to hello@withjosephine.com.",
    action: (
      <Button href="/book/birth-chart" variant="outlined" className="block w-full text-center">
        Book the Birth Chart Reading yourself
      </Button>
    ),
  },
};

export const WithLink: Story = {
  args: {
    heading: "Sent to Anna",
    body: "anna@email.com · just now.",
    action: (
      <button type="button" className={`${goldLinkClasses} font-body text-sm`}>
        Wrong address? Fix it and send again (1 left)
      </button>
    ),
  },
};

export const MessageOnly: Story = {
  args: {
    heading: "This link doesn't work any more",
    body: "Write to hello@withjosephine.com and Josephine will help.",
  },
};
