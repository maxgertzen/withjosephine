import type { Meta, StoryObj } from "@storybook/react";

import { Hero } from "./Hero";

const meta: Meta<typeof Hero> = {
  title: "Components/Hero",
  component: Hero,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Hero>;

export const Default: Story = {};

export const WithCustomContent: Story = {
  args: {
    content: {
      tagline: "Spiritual Guide + Intuitive Reader",
      introGreeting: "Welcome to your journey.",
      introBody:
        "Every soul carries a unique blueprint.\n\nLet me help you uncover yours through the wisdom of the stars and the Akashic Records.",
      ctaText: "Begin Your Journey",
    },
  },
};
