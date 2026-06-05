import type { Meta, StoryObj } from "@storybook/react";

import { LegalPageLayout } from "./LegalPageLayout";

const meta: Meta<typeof LegalPageLayout> = {
  title: "Layouts/LegalPageLayout",
  component: LegalPageLayout,
};

export default meta;
type Story = StoryObj<typeof LegalPageLayout>;

const sharedBodyClass =
  "font-body text-base text-j-text leading-[1.9] font-light flex flex-col gap-5";
const headingClass = "font-display text-2xl italic text-j-text-heading mt-12 mb-4";

export const Privacy: Story = {
  args: {
    tag: "✦ Privacy",
    title: "Privacy Policy",
    lastUpdated: "2026-04-15",
    children: (
      <div className={sharedBodyClass}>
        <p>
          This policy explains what information Josephine collects when you book a reading, why
          it&rsquo;s collected, and the rights you have over it.
        </p>
        <h2 className={headingClass}>What is collected</h2>
        <p>
          Contact details (name, email), reading-specific intake answers, and payment confirmation
          via Stripe. No analytics or advertising cookies.
        </p>
        <h2 className={headingClass}>How long it&rsquo;s kept</h2>
        <p>
          Reading details: until delivery plus 30 days. Voice notes and PDFs: 90 days from the
          unique listen link. Payment records: 7 years for tax and accounting.
        </p>
      </div>
    ),
  },
};

export const Terms: Story = {
  args: {
    tag: "✦ Terms of Service",
    title: "Terms of Service",
    lastUpdated: "2026-04-15",
    children: (
      <div className={sharedBodyClass}>
        <p>
          By booking a reading you agree to these terms. Readings are spiritual and reflective
          services intended for personal insight, not medical, legal, or financial advice.
        </p>
        <h2 className={headingClass}>Your booking</h2>
        <p>
          Once payment is processed Josephine begins the reading. Delivery is within 7 days via
          a private listen link with a voice note and PDF.
        </p>
        <h2 className={headingClass}>Cancellations and refunds</h2>
        <p>
          All purchases are non-refundable digital services. See the refund policy for the full
          cooling-off and statutory-rights detail.
        </p>
      </div>
    ),
  },
};

export const RefundPolicy: Story = {
  args: {
    tag: "✦ Refund Policy",
    title: "Refund Policy",
    lastUpdated: "2026-04-15",
    children: (
      <div className={sharedBodyClass}>
        <p>
          Josephine&rsquo;s readings are personalised digital services. Once preparation begins,
          they cannot be returned, transferred, or reused.
        </p>
        <h2 className={headingClass}>Cooling-off period</h2>
        <p>
          You may cancel within 14 days of purchase as long as preparation has not yet started.
          Because most readings begin promptly, your reading link triggers a clear consent step
          before preparation begins.
        </p>
        <h2 className={headingClass}>Statutory rights</h2>
        <p>
          This policy does not affect any statutory consumer rights you may have under UK or EU
          law, including the right to a remedy if the service is materially defective.
        </p>
      </div>
    ),
  },
};
