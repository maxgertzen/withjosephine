import { ContactEmailLink } from "@/components/ContactEmailLink";

export function RefundPolicyFallbackBody() {
  return (
    <>
      <section className="flex flex-col gap-5">
        <p className="font-body text-base text-j-text leading-[1.9] font-light">
          Readings are <strong className="font-medium">non-refundable</strong>. Each one is
          prepared personally by Josephine - not generated, not templated - and the work begins
          the moment your purchase is complete.
        </p>
        <p className="font-body text-base text-j-text-muted leading-[1.9] font-light">
          When you book, you tick a checkbox waiving your 14-day cooling-off right under EU
          Consumer Rights Directive 2011/83 Art. 16(m) (&ldquo;supply of digital content not on
          a tangible medium&rdquo;). That waiver is the legal mechanism that allows Josephine
          to start work straight away rather than wait fourteen days.
        </p>
      </section>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Duplicate &amp; erroneous charges
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        If Stripe has charged you more than once for the same reading, or charged you for a
        reading you did not attempt to book, email <ContactEmailLink /> with the charge date and
        receipt. Duplicate or unintended charges are refunded in full: those are payment-system
        errors, not refund requests, and the no-refund policy doesn&rsquo;t apply to them.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Delivery issues
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        If Josephine doesn&rsquo;t deliver your reading within the timeframe she committed to,
        and hasn&rsquo;t been in touch with a revised timeline, email <ContactEmailLink />. She
        resolves non-delivery situations one-to-one, typically by completing the reading on a
        new timeline rather than by refund.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Dissatisfaction with the content
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Readings are interpretive and personal. Disagreement with, or disappointment in, the
        content of a completed reading is not grounds for a refund. If something about your
        reading felt wrong, Josephine would genuinely like to hear about it. Email her at{" "}
        <ContactEmailLink />.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Statutory rights
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Nothing in this policy overrides any non-waivable consumer rights you may have under
        the law of your country of residence. The Art. 16(m) waiver above is itself the
        statutory mechanism for opting out of the standard fourteen-day cooling-off right; if
        you didn&rsquo;t tick that checkbox at checkout, the booking didn&rsquo;t complete.
      </p>
    </>
  );
}
