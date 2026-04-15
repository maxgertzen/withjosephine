import type { Metadata } from "next";
import { ContactEmailLink } from "@/components/ContactEmailLink";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { PortableTextContent } from "@/components/PortableTextContent";
import {
  buildLegalMetadata,
  resolveLegalPage,
  type LegalPageFallback,
} from "@/lib/legalPage";

const SLUG = "refund-policy";
const FALLBACK: LegalPageFallback = {
  tag: "✦ Refunds",
  title: "Refund Policy",
  lastUpdated: "2026-04-15",
  metaTitle: "Refund Policy — Josephine",
  metaDescription:
    "When refunds are available for Josephine's readings, when they aren't, and how to request one.",
};

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalMetadata(SLUG, FALLBACK);
}

export default async function RefundPolicyPage() {
  const { doc, tag, title, lastUpdated } = await resolveLegalPage(
    SLUG,
    FALLBACK,
  );

  return (
    <LegalPageLayout tag={tag} title={title} lastUpdated={lastUpdated}>
      {doc?.body?.length ? (
        <PortableTextContent value={doc.body} />
      ) : (
        <>
      <section className="flex flex-col gap-5">
        <p className="font-body text-base text-j-text leading-[1.9] font-light">
          Because each reading is created personally by Josephine — not
          generated, not templated — refund eligibility is tied to how much
          of that work has started.
        </p>
        <p className="font-body text-base text-j-text-muted leading-[1.9] font-light">
          The single moment that decides refund eligibility is whether
          you&rsquo;ve submitted the intake form. The rest of this page
          explains what that means in practice.
        </p>
      </section>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        When refunds are available
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        You are eligible for a full refund if{" "}
        <strong className="font-medium">
          you have not yet submitted the intake form
        </strong>{" "}
        (the Google Form sent to you after booking). Request within{" "}
        <strong className="font-medium">14 days</strong> of payment.
      </p>
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-3">
        This covers situations such as:
      </p>
      <ul className="mt-3 flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5">
        <li>You changed your mind before sending your details.</li>
        <li>You booked the wrong reading type.</li>
        <li>
          You were charged by accident (for example, a duplicate payment).
        </li>
      </ul>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        When refunds are not available
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Once you have{" "}
        <strong className="font-medium">
          submitted the intake form to Josephine
        </strong>
        , your reading has effectively started: she uses those details to
        begin her research and chart work. At that point the reading is no
        longer refundable.
      </p>
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-3">
        This also applies once the reading has been delivered (voice note +
        PDF sent to your email).
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Duplicate &amp; erroneous charges
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        If Stripe has charged you more than once for the same reading, or
        charged you for a reading you did not attempt to book, email{" "}
        <ContactEmailLink />{" "}
        with the charge date and receipt. The duplicate or unintended charge
        will be refunded in full regardless of the rules above.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Delivery issues
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        If Josephine has not delivered your reading within{" "}
        <strong className="font-medium">14 days</strong> of receiving your
        completed intake form, and has not been in touch with a revised
        timeline, email{" "}
        <ContactEmailLink />
        . A refund in this case is given as a matter of good faith.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Dissatisfaction with the content
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Readings are interpretive and personal. Disagreement with, or
        disappointment in, the content of a completed reading is not by
        itself grounds for a refund. If something about your reading felt
        wrong, Josephine would genuinely like to hear about it — email her
        at{" "}
        <ContactEmailLink />
        .
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        How to request a refund
      </h2>
      <ol className="flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-decimal pl-5">
        <li>
          Email{" "}
          <ContactEmailLink />{" "}
          from the address used at checkout.
        </li>
        <li>Include the Stripe receipt or the date of payment.</li>
        <li>Briefly explain the reason for the request.</li>
      </ol>
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-3">
        Eligible refunds are processed through Stripe within{" "}
        <strong className="font-medium">5–10 business days</strong> back to
        the original payment method. Your bank may take a further 5–10
        business days to credit it.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Statutory rights
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Nothing in this policy overrides any non-waivable consumer rights
        you may have under the law of your country of residence.
      </p>
        </>
      )}
    </LegalPageLayout>
  );
}
