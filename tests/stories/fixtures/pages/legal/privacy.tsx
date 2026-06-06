import type { ReactNode } from "react";

export const PRIVACY_STORY_META = {
  tag: "✦ Privacy",
  title: "Privacy Policy",
  lastUpdated: "2026-04-15",
};

export function PrivacyStoryContent(): ReactNode {
  return (
    <div className="font-body text-base text-j-text leading-[1.9] font-light flex flex-col gap-5">
      <p>
        This policy explains what information Josephine collects when you book a reading, why
        it&rsquo;s collected, who it&rsquo;s shared with, and the rights you have over it.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        What is collected
      </h2>
      <ul className="flex flex-col gap-3 list-disc pl-5">
        <li>
          <strong className="font-medium">Contact details</strong>: your name and email address,
          which you provide when booking.
        </li>
        <li>
          <strong className="font-medium">Reading details</strong>: the inputs Josephine needs to
          prepare your reading, submitted through the intake form after booking.
        </li>
        <li>
          <strong className="font-medium">Payment information</strong>: handled entirely by Stripe.
          Josephine never sees your card number.
        </li>
      </ul>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        How long it&rsquo;s kept
      </h2>
      <p>
        Reading details are kept in Josephine&rsquo;s inbox and private Google Drive until she has
        completed and delivered the reading, plus up to 30 days afterwards. After delivery, your
        voice note and PDF stay reachable for 90 days. Payment records are kept for 7 years to meet
        accounting and tax requirements.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">Your rights</h2>
      <p>
        Depending on where you live, you have rights under GDPR, UK GDPR, or CCPA. You can ask
        Josephine to show you what she holds about you, correct anything that&rsquo;s wrong, delete
        your information, or stop processing it for anything beyond the reading itself.
      </p>
    </div>
  );
}
