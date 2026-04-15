import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmailLink } from "@/components/ContactEmailLink";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { PortableTextContent } from "@/components/PortableTextContent";
import { ROUTES } from "@/lib/constants";
import {
  buildLegalMetadata,
  resolveLegalPage,
  type LegalPageFallback,
} from "@/lib/legalPage";

const SLUG = "terms";
const FALLBACK: LegalPageFallback = {
  tag: "✦ Terms",
  title: "Terms of Service",
  lastUpdated: "2026-04-15",
  metaTitle: "Terms of Service — Josephine",
  metaDescription:
    "The agreement between you and Josephine when you book a soul reading: what's delivered, how, and the limits of it.",
};

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalMetadata(SLUG, FALLBACK);
}

export default async function TermsPage() {
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
          These terms govern your use of{" "}
          <span className="italic">withjosephine.com</span> and the readings
          you book through it. By booking a reading you agree to them. If
          anything here is unclear, email{" "}
          <ContactEmailLink />{" "}
          before booking.
        </p>
      </section>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Who can book
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        You must be 18 years of age or older to book a reading. By booking
        you confirm you are. Gift bookings for someone else are welcome,
        provided that person also meets this requirement and has consented
        to having a reading done for them.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        What&rsquo;s delivered
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Each reading is created personally by Josephine and delivered as:
      </p>
      <ul className="mt-3 flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5">
        <li>
          A <strong className="font-medium">voice note recording</strong>{" "}
          (audio file, usually 30–60 minutes depending on the reading type).
        </li>
        <li>
          A <strong className="font-medium">supporting PDF</strong>{" "}
          summarising key points for you to keep.
        </li>
      </ul>
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-3">
        Both are sent to the email address you used at checkout.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Delivery timeline
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Josephine aims to deliver within{" "}
        <strong className="font-medium">7 days</strong> of receiving your
        completed intake form. The clock starts once the intake form has
        been submitted, not at payment — because readings require birth
        details and context to begin. If a delay is expected, Josephine will
        contact you directly with a revised date.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Your responsibility
      </h2>
      <ul className="flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5">
        <li>
          Provide accurate intake details (full name, date of birth, and
          the photograph you submit). Readings are only as precise as the
          details you provide.
        </li>
        <li>
          Check the email inbox you used at checkout, including spam
          folders. Delivery failures caused by full mailboxes, wrong
          addresses, or spam filters are not Josephine&rsquo;s
          responsibility.
        </li>
        <li>
          Complete the intake form within{" "}
          <strong className="font-medium">60 days</strong> of booking. After
          that, Josephine may close the booking without a refund.
        </li>
      </ul>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        What a reading is (and is not)
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Readings are a reflective, spiritual, interpretive practice rooted
        in astrology and the Akashic tradition. They are offered for
        personal insight and self-exploration.
      </p>
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-3">
        All readings are provided for{" "}
        <strong className="font-medium">
          entertainment and self-reflection purposes only
        </strong>{" "}
        and should not be relied upon as factual predictions or guarantees
        of future outcomes.
      </p>
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-3">
        A reading is <strong className="font-medium">not</strong> a
        substitute for:
      </p>
      <ul className="mt-3 flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5">
        <li>Medical or psychiatric advice, diagnosis, or treatment.</li>
        <li>Licensed therapy or counselling.</li>
        <li>Legal advice.</li>
        <li>Financial, investment, or tax advice.</li>
        <li>Emergency services.</li>
      </ul>
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-3">
        If you are in crisis, please contact a qualified professional or an
        emergency service in your country.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Your use of the reading
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        You may keep and revisit your voice note and PDF for personal use.
        You may not republish, resell, or redistribute them in full or in
        part without written permission from Josephine.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Refunds &amp; cancellations
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Refund eligibility depends on where you are in the process. Full
        details are in the{" "}
        <Link
          href={ROUTES.refundPolicy}
          className="text-j-accent hover:underline"
        >
          Refund Policy
        </Link>
        .
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Limitation of liability
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        To the maximum extent permitted by law, Josephine&rsquo;s total
        liability to you in connection with a reading is limited to the
        amount you paid for that reading. Josephine is not liable for any
        indirect, incidental, consequential, or decision-based losses
        arising from how you choose to interpret or act on a reading.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Changes
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        These terms may change over time. The version that applies to your
        booking is the one live on the site at the moment you pay. Material
        changes will update the &ldquo;Last updated&rdquo; date at the top.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Governing law
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        These terms are governed by the laws of{" "}
        <strong className="font-medium">England and Wales</strong>. If you
        are a consumer outside England and Wales, this does not affect any
        mandatory consumer-protection rights you have under the law of your
        country of residence.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Contact
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Questions about these terms go to{" "}
        <ContactEmailLink />
        .
      </p>
        </>
      )}
    </LegalPageLayout>
  );
}
