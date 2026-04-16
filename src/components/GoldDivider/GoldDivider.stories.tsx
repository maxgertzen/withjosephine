import type { Meta, StoryObj } from "@storybook/react";

import { GoldDivider } from "./GoldDivider";

const meta: Meta<typeof GoldDivider> = {
  title: "UI/GoldDivider",
  component: GoldDivider,
};

export default meta;
type Story = StoryObj<typeof GoldDivider>;

export const Default: Story = {};

export const CustomWidth: Story = {
  args: {
    className: "max-w-xs mx-auto",
  },
};
