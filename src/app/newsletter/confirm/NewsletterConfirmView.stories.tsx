import type { Meta, StoryObj } from "@storybook/react";

import { NEWSLETTER_DEFAULTS } from "@/data/defaults";

import { NewsletterConfirmView } from "./NewsletterConfirmView";

const meta: Meta<typeof NewsletterConfirmView> = {
  title: "Pages/NewsletterConfirm",
  component: NewsletterConfirmView,
  parameters: { layout: "fullscreen" },
  args: { words: NEWSLETTER_DEFAULTS },
};

export default meta;
type Story = StoryObj<typeof NewsletterConfirmView>;

export const AskToConfirm: Story = { args: { state: { kind: "ask", token: "demo-token" } } };

export const Confirmed: Story = { args: { state: { kind: "confirmed" } } };

export const LinkDidNotWork: Story = { args: { state: { kind: "failed" } } };
