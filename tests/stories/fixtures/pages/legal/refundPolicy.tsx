import type { ReactNode } from "react";

export const REFUND_POLICY_STORY_META = {
  tag: "✦ Refund Policy",
  title: "Refund Policy",
  lastUpdated: "2026-04-15",
};

export function RefundPolicyStoryContent(): ReactNode {
  return (
    <div className="font-body text-base text-j-text leading-[1.9] font-light flex flex-col gap-5">
      <p>
        Josephine&rsquo;s readings are personalised digital services. Once preparation begins, they
        cannot be returned, transferred, or reused.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Cooling-off period
      </h2>
      <p>
        You may cancel within 14 days of purchase as long as preparation has not yet started.
        Because most readings begin promptly, your reading link triggers a clear consent step
        before preparation begins. After preparation has started, the cooling-off right ends.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">Gift readings</h2>
      <p>
        For gift purchases, the same cooling-off rule applies, measured from the purchase date,
        not the recipient&rsquo;s claim date. Once the recipient submits their intake and
        preparation begins, the cooling-off right ends for that gift.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Statutory rights
      </h2>
      <p>
        This policy does not affect any statutory consumer rights you may have under UK or EU law,
        including the right to a remedy if the service is materially defective.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        How to request
      </h2>
      <p>
        Email Josephine within the cooling-off window. If the request is eligible, the refund
        lands on the same payment method you used at checkout within 14 days.
      </p>
    </div>
  );
}
