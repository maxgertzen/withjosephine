import type { Meta, StoryObj } from "@storybook/react";
import { StarField } from "./StarField";

const meta: Meta<typeof StarField> = {
  title: "Decorative/StarField",
  component: StarField,
  decorators: [
    (Story) => (
      <div className="relative bg-j-bg-dark min-h-[400px] w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StarField>;

export const Default: Story = {
  args: {
    count: 110,
  },
};

export const Sparse: Story = {
  args: {
    count: 30,
  },
};
