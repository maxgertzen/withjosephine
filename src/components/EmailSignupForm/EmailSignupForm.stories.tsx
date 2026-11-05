import type { Meta, StoryObj } from "@storybook/react";

import { LINKS_PAGE_EMAIL_FORM_DEFAULTS, NEWSLETTER_DEFAULTS } from "@/data/defaults";
import { newsletterConsentWords } from "@/lib/signup/newsletterContent";

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

const CONSENT = newsletterConsentWords(NEWSLETTER_DEFAULTS);

export const DownloadWithNewsletterBox: Story = {
  args: { words: LINKS_PAGE_EMAIL_FORM_DEFAULTS, newsletter: { box: "optional", consent: CONSENT }, buttonKey: "file:demo" },
};

export const DownloadWhileNewsletterIsOff: Story = {
  args: { words: LINKS_PAGE_EMAIL_FORM_DEFAULTS, newsletter: null, buttonKey: "file:demo" },
};

export const NewsletterOnly: Story = {
  args: { words: NEWSLETTER_DEFAULTS, newsletter: { box: "required", consent: CONSENT } },
};

export const NewsletterOnlyFooterLook: Story = {
  args: { words: NEWSLETTER_DEFAULTS, newsletter: { box: "required", consent: CONSENT }, look: "underline" },
};
