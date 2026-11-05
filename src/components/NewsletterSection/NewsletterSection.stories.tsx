import type { Meta, StoryObj } from "@storybook/react";

import { GoldDivider } from "@/components/GoldDivider";

import { NewsletterSection } from "./NewsletterSection";

const meta: Meta<typeof NewsletterSection> = {
  title: "Components/Forms/NewsletterSection",
  component: NewsletterSection,
  args: { fallback: <GoldDivider className="max-w-xs mx-auto" /> },
};

export default meta;
type Story = StoryObj<typeof NewsletterSection>;

export const Default: Story = {};

export const Phone: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
