import { PILLAR_PLATE } from "@story-fixtures/pages/notes";
import type { Meta, StoryObj } from "@storybook/react";

import { NotePlate } from "./NotePlate";

const meta: Meta<typeof NotePlate> = {
  title: "Components/Notes/NotePlate",
  component: NotePlate,
  decorators: [
    (Story) => (
      <div className="max-w-[36rem] bg-j-cream p-5">
        <Story />
      </div>
    ),
  ],
  args: { plate: PILLAR_PLATE },
};
export default meta;

type Story = StoryObj<typeof NotePlate>;

export const StackedOnPhones: Story = {};

export const SideBySideOnPhones: Story = {
  args: { plate: { ...PILLAR_PLATE, layout: "sideBySide" } },
};

export const OneColumn: Story = {
  args: {
    plate: {
      ...PILLAR_PLATE,
      label: "In the chart",
      leftHeading: undefined,
      leftLines: [
        "Without one, certain parts of the chart (your rising sign, house placements) are less reliable.",
      ],
      rightHeading: undefined,
      rightLines: undefined,
    },
  },
};

const WRAPPING_PLATE = {
  ...PILLAR_PLATE,
  leftLines: [
    "Your gifts, and the places in your life where they ask to be used",
    "Your patterns",
    "Your purpose and your path",
  ],
};

export const WrappingPointStacked: Story = {
  args: { plate: WRAPPING_PLATE },
};

export const WrappingPointSideBySide: Story = {
  args: { plate: { ...WRAPPING_PLATE, layout: "sideBySide" } },
};
