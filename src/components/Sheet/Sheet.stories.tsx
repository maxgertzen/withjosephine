import type { Meta, StoryObj } from "@storybook/react";

import { Sheet } from "./Sheet";

const meta: Meta<typeof Sheet> = {
  title: "Components/Booking/Sheet",
  component: Sheet,
  args: {
    open: true,
    onClose: () => {},
    labelledBy: "sheet-story-title",
  },
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Sheet>;

export const Open: Story = {
  args: {
    children: (
      <>
        <h2
          id="sheet-story-title"
          className="font-display italic text-[1.6rem] text-j-text-heading"
        >
          Birth Chart Reading · $89
        </h2>
        <p className="font-body text-sm text-j-text">Any content sits inside the panel.</p>
      </>
    ),
  },
};

export const LongContent: Story = {
  args: {
    children: (
      <>
        <h2
          id="sheet-story-title"
          className="font-display italic text-[1.6rem] text-j-text-heading"
        >
          Scrolls inside the panel
        </h2>
        {Array.from({ length: 30 }, (_, index) => (
          <p key={index} className="font-body text-sm text-j-text">
            Line {index + 1}
          </p>
        ))}
      </>
    ),
  },
};
