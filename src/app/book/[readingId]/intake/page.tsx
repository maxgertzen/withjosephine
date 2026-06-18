import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingPageShell } from "@/components/BookingPageShell";
import { IntakeForm } from "@/components/IntakeForm";
import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import { findUserById } from "@/lib/auth/users";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { BOOKING_PAGE_ROUTES } from "@/lib/http/routes";
import { fetchBookingForm, fetchBookingPage, fetchReading } from "@/lib/sanity/fetch";

type IntakePageProps = {
  params: Promise<{ readingId: string }>;
};

type VariantCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

const VARIANT_COPY: Record<string, VariantCopy> = {
  "soul-blueprint": {
    eyebrow: "\u2726 Soul Blueprint Intake",
    title: "A few things, before we begin.",
    subtitle:
      "Take your time. The more honestly you write, the more your reading can hold.",
  },
  "birth-chart": {
    eyebrow: "\u2726 Birth Chart Intake",
    title: "A few things, before we begin.",
    subtitle: "For a Birth Chart, I only need the moment you arrived here.",
  },
  "akashic-record": {
    eyebrow: "\u2726 Akashic Record Intake",
    title: "A few things, before we begin.",
    subtitle:
      "For the records, I\u2019ll need your name, your photo, and three questions.",
  },
};

const FALLBACK_COPY: VariantCopy = {
  eyebrow: "\u2726 Intake",
  title: "A few things, before we begin.",
  subtitle: "Take your time. There\u2019s no wrong answer.",
};

export async function generateMetadata({ params }: IntakePageProps): Promise<Metadata> {
  const { readingId } = await params;
  const reading = await fetchReading(readingId);
  const title = reading ? `Intake — ${reading.name}` : "Intake — Josephine";
  return {
    title,
    description: "Share your details so Josephine can prepare your reading.",
    robots: { index: false, follow: false },
  };
}

export default async function IntakePage({ params }: IntakePageProps) {
  const { readingId } = await params;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = cookieValue ? await getActiveSession({ cookieValue }) : null;
  const signedInUser = session ? await findUserById(session.userId) : null;

  const [reading, bookingForm, bookingPage] = await Promise.all([
    fetchReading(readingId),
    fetchBookingForm(),
    fetchBookingPage(),
  ]);

  if (!reading) {
    notFound();
  }

  if (!bookingForm) {
    notFound();
  }

  const filteredSections = filterSectionsForReading(bookingForm.sections, reading.slug);
  const copy = VARIANT_COPY[reading.slug] ?? FALLBACK_COPY;

  return (
    <BookingPageShell backHref={BOOKING_PAGE_ROUTES.letter(reading.slug)}>
      <p className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-j-accent mb-3">
        {copy.eyebrow}
      </p>
      <h1 className="font-display italic font-medium text-[clamp(1.85rem,5vw,2.25rem)] leading-tight text-j-text-heading mb-3">
        {copy.title}
      </h1>
      <p className="font-display italic text-[1.05rem] leading-snug text-j-text-muted max-w-[50ch] mb-10">
        {copy.subtitle}
      </p>

      {signedInUser ? (
        <p className="font-body text-sm text-j-text-muted max-w-[50ch] mb-8">
          Signed in as {signedInUser.email}, so this reading will be saved to your library.
          Booking for someone else?{" "}
          <Link href={BOOKING_PAGE_ROUTES.gift(reading.slug)} className="underline">
            Send it as a gift
          </Link>
          .
        </p>
      ) : null}

      <IntakeForm
        readingId={reading.slug}
        readingName={reading.name}
        sections={filteredSections}
        nonRefundableNotice={bookingForm.nonRefundableNotice}
        pagination={bookingForm.pagination}
        loadingStateCopy={bookingForm.loadingStateCopy}
        submitLabel={bookingPage?.paymentButtonText}
        nextLabel={bookingForm.nextButtonText}
        saveLaterLabel={bookingForm.saveAndContinueLaterText}
        pageIndicatorTagline={bookingForm.pageIndicatorTagline}
        prefilledEmail={signedInUser?.email ?? null}
      />
    </BookingPageShell>
  );
}
