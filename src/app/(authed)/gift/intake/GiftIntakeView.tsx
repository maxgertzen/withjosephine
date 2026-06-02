import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";
import { IntakeForm } from "@/components/IntakeForm";
import type { SanityFormSection, SanityPagination } from "@/lib/sanity/types";

import { RecipientEmailEscapeHatch } from "./RecipientEmailEscapeHatch";

export type GiftIntakeFormLabels = {
  nextLabel?: string;
  saveLaterLabel?: string;
  pageIndicatorTagline?: string;
};

export type GiftIntakeViewProps = {
  submissionId: string;
  recipientEmail: string | null;
  eyebrow: string;
  heading: string;
  lede: string;
  readingSlug: string;
  readingName: string;
  sections: SanityFormSection[];
  pagination: SanityPagination | undefined;
  formLabels: GiftIntakeFormLabels;
};

export function GiftIntakeView({
  submissionId,
  recipientEmail,
  eyebrow,
  heading,
  lede,
  readingSlug,
  readingName,
  sections,
  pagination,
  formLabels,
}: GiftIntakeViewProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <BookingFlowHeader backHref="/" />

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <article className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className="relative px-6 py-10 md:px-12 md:py-14">
            <p className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-j-accent mb-3">
              {eyebrow}
            </p>
            <h1 className="font-display italic font-medium text-[clamp(1.85rem,5vw,2.25rem)] leading-tight text-j-text-heading mb-3">
              {heading}
            </h1>
            <p className="font-display italic text-[1.05rem] leading-snug text-j-text-muted max-w-[50ch] mb-6">
              {lede}
            </p>
            <RecipientEmailEscapeHatch recipientEmail={recipientEmail} />

            <IntakeForm
              readingId={readingSlug}
              readingName={readingName}
              sections={sections}
              nonRefundableNotice=""
              pagination={pagination}
              loadingStateCopy="Sending your answers…"
              submitLabel="Send my answers"
              nextLabel={formLabels.nextLabel}
              saveLaterLabel={formLabels.saveLaterLabel}
              pageIndicatorTagline={formLabels.pageIndicatorTagline}
              mode="redeem"
              redeemSubmissionId={submissionId}
              redeemSuccessUrl={`/thank-you/${submissionId}?gift=1&redeemed=1`}
              prefilledEmail={recipientEmail}
            />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
