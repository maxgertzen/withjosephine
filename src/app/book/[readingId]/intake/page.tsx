import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { IntakeForm } from "@/components/IntakeForm";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { fetchBookingForm, fetchReading } from "@/lib/sanity/fetch";

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

  const [reading, bookingForm] = await Promise.all([
    fetchReading(readingId),
    fetchBookingForm(),
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
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <header
        className="relative z-10 max-w-5xl mx-auto px-6 flex items-center justify-between border-b border-j-border-subtle"
        style={{
          paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "1rem",
        }}
      >
        <Link
          href={`/book/${reading.slug}`}
          className="font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-11 px-2"
        >
          ‹ Back
        </Link>
        <span className="font-display italic text-lg md:text-xl text-j-text-heading tracking-wide">
          Josephine Soul Readings
        </span>
        <Link
          href="/about"
          className="font-display italic text-sm text-j-text-muted hover:text-j-text transition-colors inline-flex items-center min-h-11 px-2"
        >
          About Josephine
        </Link>
      </header>

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
              {copy.title}
            </h1>
            <p className="font-display italic text-[1.05rem] leading-snug text-j-text-muted max-w-[50ch] mb-10">
              {copy.subtitle}
            </p>

            <IntakeForm
              readingId={reading.slug}
              readingName={reading.name}
              sections={filteredSections}
              nonRefundableNotice={bookingForm.nonRefundableNotice}
              confirmationMessage={bookingForm.confirmationMessage}
              pagination={bookingForm.pagination}
            />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
