import type { Meta, StoryObj } from "@storybook/react";

import { Footer } from "./Footer";
import { footerNewsletterSlot } from "./footerNewsletterSlot";
import { NewsletterSlotProvider } from "./NewsletterContext";

const meta: Meta<typeof Footer> = {
  title: "Components/Navigation/Footer",
  component: Footer,
  decorators: [
    (Story) => (
      <div className="max-w-4xl mx-auto">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const Default: Story = {};

export const WithNewsletterBox: Story = {
  decorators: [
    (Story) => (
      <NewsletterSlotProvider slot={footerNewsletterSlot({ show: true })}>
        <Story />
      </NewsletterSlotProvider>
    ),
  ],
};
