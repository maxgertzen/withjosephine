import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { IntakeForm } from "@/components/IntakeForm";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { fetchBookingForm, fetchReading } from "@/lib/sanity/fetch";

type IntakePageProps = {
  params: Promise<{ readingId: string }>;
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

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <header className="relative z-10 max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link
          href={`/book/${reading.slug}`}
          className="font-body text-sm text-j-text-muted hover:text-j-accent transition-colors"
        >
          ← Back to reading details
        </Link>
        <Link href="/">
          <Image
            src="/images/header-logo.png"
            alt="Josephine Soul Readings"
            width={60}
            height={30}
            priority
            className="h-auto w-[clamp(120px,8vw,160px)]"
          />
        </Link>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body">
            ✦ {reading.tag}
          </span>
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-light italic text-j-text-heading leading-tight mt-2">
            {bookingForm.title}
          </h1>
          {bookingForm.intro ? (
            <p className="font-body text-base text-j-text-muted leading-relaxed mt-4 whitespace-pre-line">
              {bookingForm.intro}
            </p>
          ) : null}
          {bookingForm.description ? (
            <p className="font-body text-sm text-j-text-muted leading-relaxed mt-3 whitespace-pre-line">
              {bookingForm.description}
            </p>
          ) : null}
        </div>

        <IntakeForm
          readingId={reading.slug}
          readingName={reading.name}
          sections={filteredSections}
          nonRefundableNotice={bookingForm.nonRefundableNotice}
          confirmationMessage={bookingForm.confirmationMessage}
          pagination={bookingForm.pagination}
        />
      </main>

      <Footer />
    </div>
  );
}
