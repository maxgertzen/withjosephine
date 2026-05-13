import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";
import { IntakeForm } from "@/components/IntakeForm";
import { GIFT_INTAKE_PAGE_DEFAULTS } from "@/data/defaults";
import {
  GIFT_CLAIM_COOKIE,
  verifyGiftClaimCookie,
} from "@/lib/booking/giftClaimSession";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { findSubmissionById } from "@/lib/booking/submissions";
import {
  fetchBookingForm,
  fetchBookingPage,
  fetchGiftIntakePage,
  fetchReading,
} from "@/lib/sanity/fetch";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const copy = (await fetchGiftIntakePage()) ?? GIFT_INTAKE_PAGE_DEFAULTS;
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: { index: false, follow: false },
  };
}

type GiftIntakePageProps = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function GiftIntakePage({ searchParams }: GiftIntakePageProps) {
  const { welcome } = await searchParams;

  const jar = await cookies();
  const cookieValue = jar.get(GIFT_CLAIM_COOKIE)?.value ?? null;
  const submissionId = await verifyGiftClaimCookie(cookieValue);

  if (!submissionId) {
    redirect("/gift/claim");
  }

  // Sanity copy doesn't depend on the submission lookup; start it in parallel.
  const bookingFormPromise = fetchBookingForm();
  const bookingPagePromise = fetchBookingPage();
  const intakePagePromise = fetchGiftIntakePage();

  const submission = await findSubmissionById(submissionId);
  if (!submission || !submission.isGift) {
    notFound();
  }
  if (submission.giftClaimedAt) {
    redirect("/");
  }

  const [reading, bookingForm, bookingPage, intakePageCopy] = await Promise.all([
    fetchReading(submission.reading?.slug ?? ""),
    bookingFormPromise,
    bookingPagePromise,
    intakePagePromise,
  ]);

  if (!reading || !bookingForm) {
    notFound();
  }

  const copy = intakePageCopy ?? GIFT_INTAKE_PAGE_DEFAULTS;
  const lede = copy.lede.replace(/\{readingName\}/g, reading.name);

  const filteredSections = filterSectionsForReading(
    bookingForm.sections,
    reading.slug,
  );

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
              {copy.eyebrow}
            </p>
            <h1 className="font-display italic font-medium text-[clamp(1.85rem,5vw,2.25rem)] leading-tight text-j-text-heading mb-3">
              {welcome ? copy.headingWelcome : copy.heading}
            </h1>
            <p className="font-display italic text-[1.05rem] leading-snug text-j-text-muted max-w-[50ch] mb-10">
              {lede}
            </p>

            <IntakeForm
              readingId={reading.slug}
              readingName={reading.name}
              sections={filteredSections}
              nonRefundableNotice={bookingForm.nonRefundableNotice}
              pagination={bookingForm.pagination}
              loadingStateCopy={bookingForm.loadingStateCopy}
              submitLabel={bookingPage?.paymentButtonText ?? "Prepare my reading"}
              nextLabel={bookingForm.nextButtonText}
              saveLaterLabel={bookingForm.saveAndContinueLaterText}
              pageIndicatorTagline={bookingForm.pageIndicatorTagline}
              mode="redeem"
              redeemSubmissionId={submission._id}
              redeemSuccessUrl={`/thank-you/${submission._id}?gift=1`}
            />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
