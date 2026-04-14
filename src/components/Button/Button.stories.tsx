import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Book a Reading",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Explore Readings",
  },
};

export const Small: Story = {
  args: {
    variant: "primary",
    size: "sm",
    children: "Small Button",
  },
};

export const Large: Story = {
  args: {
    variant: "primary",
    size: "lg",
    children: "Large Button",
  },
};

export const AsLink: Story = {
  args: {
    variant: "primary",
    href: "/readings",
    children: "Explore Readings",
  },
};
