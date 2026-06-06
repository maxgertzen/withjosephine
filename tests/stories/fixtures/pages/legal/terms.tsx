import type { ReactNode } from "react";

export const TERMS_STORY_META = {
  tag: "✦ Terms of Service",
  title: "Terms of Service",
  lastUpdated: "2026-04-15",
};

export function TermsStoryContent(): ReactNode {
  return (
    <div className="font-body text-base text-j-text leading-[1.9] font-light flex flex-col gap-5">
      <p>
        By booking a reading you agree to these terms. Readings are spiritual and reflective
        services intended for personal insight, not medical, legal, or financial advice.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">Your booking</h2>
      <p>
        Once payment is processed Josephine begins the reading. Delivery is within 7 days via a
        private listen link with a voice note and PDF. The link remains accessible for 90 days
        after delivery.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">Gift readings</h2>
      <p>
        If you purchase a reading as a gift, the recipient receives a claim link. They&rsquo;ll
        submit their own intake details when ready. The purchaser is the contracting party until
        the recipient claims; after that, the reading is delivered to the recipient.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Cancellations and refunds
      </h2>
      <p>
        All purchases are non-refundable digital services. See the refund policy for the full
        cooling-off and statutory-rights detail.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">Limitations</h2>
      <p>
        Readings are offered in good faith as personal reflection. They are not a substitute for
        professional medical, legal, financial, or psychological advice. Josephine&rsquo;s
        liability is limited to the price paid for the reading.
      </p>
    </div>
  );
}
