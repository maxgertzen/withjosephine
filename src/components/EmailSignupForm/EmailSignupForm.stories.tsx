import type { Meta, StoryObj } from "@storybook/react";

import { LINKS_PAGE_EMAIL_FORM_DEFAULTS, NEWSLETTER_DEFAULTS } from "@/data/defaults";

import { EmailSignupForm } from "./EmailSignupForm";

const meta: Meta<typeof EmailSignupForm> = {
  title: "Components/Forms/EmailSignupForm",
  component: EmailSignupForm,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EmailSignupForm>;

export const DownloadWithNewsletterBox: Story = {
  args: { words: LINKS_PAGE_EMAIL_FORM_DEFAULTS, newsletterBox: "optional", buttonKey: "file:demo" },
};

export const DownloadWhileNewsletterIsOff: Story = {
  args: { words: LINKS_PAGE_EMAIL_FORM_DEFAULTS, newsletterBox: "none", buttonKey: "file:demo" },
};

export const NewsletterOnly: Story = {
  args: { words: NEWSLETTER_DEFAULTS, newsletterBox: "required" },
};
