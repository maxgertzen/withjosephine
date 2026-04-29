import { Check, Clock, Mic } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import {
  BOOKING_INFO_DEFAULTS,
  ENTRY_PAGE_DEFAULTS,
} from "@/data/defaults";
import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { fetchBookingForm, fetchBookingPage, fetchReading } from "@/lib/sanity/fetch";
import type { SanityReading } from "@/lib/sanity/types";
import { buildOpenGraph } from "@/lib/seoMetadata";

export { generateReadingStaticParams as generateStaticParams };

type BookingPageProps = {
  params: Promise<{ readingId: string }>;
};

type ResolvedReading = {
  slug: string;
  tag: string;
  name: string;
  priceLabel: string;
  shortDescription: string;
  includedItems: string[];
};

function resolveReading(
  readingId: string,
  sanityReading: SanityReading | null,
): ResolvedReading | null {
  if (sanityReading) {
    return {
      slug: sanityReading.slug,
      tag: sanityReading.tag,
      name: sanityReading.name,
      priceLabel: sanityReading.priceDisplay,
      shortDescription: sanityReading.bookingSummary,
      includedItems: sanityReading.includes,
    };
  }
  const fallback = getReadingById(readingId);
  if (!fallback) return null;
  return {
    slug: readingId,
    tag: fallback.tag,
    name: fallback.name,
    priceLabel: fallback.price,
    shortDescription: fallback.bookingSummary,
    includedItems: fallback.includes,
  };
}

export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { readingId } = await params;
  const [sanityReading, bookingPage] = await Promise.all([
    fetchReading(readingId),
    fetchBookingPage(),
  ]);

  const readingName = (sanityReading ?? getReadingById(readingId))?.name;

  const title =
    sanityReading?.seo?.metaTitle ??
    bookingPage?.seo?.metaTitle ??
    (readingName ? `Book ${readingName} — Josephine` : "Book a Reading — Josephine");

  const description =
    sanityReading?.seo?.metaDescription ??
    bookingPage?.seo?.metaDescription ??
    "Choose your reading and share your details. Your voice note and PDF will be with you within 7 days.";

  const seo = sanityReading?.seo ?? bookingPage?.seo;

  return { title, description, openGraph: buildOpenGraph(seo) };
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { readingId } = await params;

  const [sanityReading, bookingPage, bookingForm] = await Promise.all([
    fetchReading(readingId),
    fetchBookingPage(),
    fetchBookingForm(),
  ]);

  const reading = resolveReading(readingId, sanityReading);
  if (!reading) {
    notFound();
  }

  const entry = bookingForm?.entryPageContent ?? {};
  const letterOpener = entry.letterOpener ?? ENTRY_PAGE_DEFAULTS.letterOpener;
  const letterBridge = entry.letterBridge ?? ENTRY_PAGE_DEFAULTS.letterBridge;
  const letterClosing = entry.letterClosing ?? ENTRY_PAGE_DEFAULTS.letterClosing;
  const dropCapCta = entry.dropCapCta ?? ENTRY_PAGE_DEFAULTS.dropCapCta;
  const dropCapCaption = entry.dropCapCaption ?? ENTRY_PAGE_DEFAULTS.dropCapCaption;
  const changeReadingLinkText =
    entry.changeReadingLinkText ?? ENTRY_PAGE_DEFAULTS.changeReadingLinkText;
  const aboutJosephineLinkText =
    entry.aboutJosephineLinkText ?? ENTRY_PAGE_DEFAULTS.aboutJosephineLinkText;

  const deliveryNote = bookingPage?.deliveryNote ?? BOOKING_INFO_DEFAULTS.deliveryNote;
  const deliverableNote = bookingPage?.formatNote ?? BOOKING_INFO_DEFAULTS.deliverableNote;

  const ctaFirstChar = dropCapCta.charAt(0);
  const ctaRest = dropCapCta.slice(1);

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <header
        className="relative z-10 max-w-5xl mx-auto px-6 flex items-center justify-between border-b border-j-border-subtle"
        style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))", paddingBottom: "1rem" }}
      >
        <Link
          href="/#readings"
          className="font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-11 px-2"
          aria-label="Back to readings"
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
          {aboutJosephineLinkText}
        </Link>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <section
          aria-labelledby="entry-title"
          className="grid grid-cols-1 md:grid-cols-2 md:gap-12 gap-8 md:items-start"
        >
          <div>
            <span className="inline-block font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-j-accent mb-6">
              <span aria-hidden="true" className="mr-2">
                ✦
              </span>
              {reading.tag}
            </span>
            <h1
              id="entry-title"
              className="font-display italic font-medium text-[clamp(2rem,5vw,3rem)] leading-tight text-j-text-heading mb-4"
            >
              {reading.name}
            </h1>
            <p className="font-display italic text-2xl text-j-accent mb-6">
              {reading.priceLabel}
            </p>
            <p className="font-display italic text-lg leading-snug text-j-text max-w-[38ch] mb-6">
              {reading.shortDescription}
            </p>

            <Link
              href="/#readings"
              className="inline-block font-display italic text-base text-j-text border-b border-j-border-gold pb-px hover:text-j-text-heading hover:border-j-accent transition-colors mb-6"
            >
              <em>{changeReadingLinkText}</em>
            </Link>

            <hr className="h-px w-full max-w-[280px] border-0 bg-gradient-to-r from-transparent via-j-accent/50 to-transparent my-6" />

            <h2 className="font-body text-[0.75rem] font-semibold tracking-[0.2em] uppercase text-j-text-muted mb-4">
              What&rsquo;s included
            </h2>
            <ul className="space-y-2 mb-8">
              {reading.includedItems.map((item, index) => (
                <li
                  key={index}
                  className="flex gap-3 items-start font-body text-base text-j-text"
                >
                  <Check
                    className="w-[18px] h-[18px] text-j-accent shrink-0 mt-1"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 p-6 border border-j-border-subtle rounded-md bg-j-blush/[0.18]">
              <div className="flex gap-3 items-start font-body text-sm text-j-text leading-snug">
                <Clock
                  className="w-4 h-4 text-j-accent shrink-0 mt-0.5"
                  aria-hidden="true"
                  strokeWidth={1.5}
                />
                <span>{deliveryNote}</span>
              </div>
              <div className="flex gap-3 items-start font-body text-sm text-j-text leading-snug">
                <Mic
                  className="w-4 h-4 text-j-accent shrink-0 mt-0.5"
                  aria-hidden="true"
                  strokeWidth={1.5}
                />
                <span>{deliverableNote}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-soft px-6 py-12 md:px-10 md:py-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
              />

              <div className="relative flex justify-center mb-6">
                <Image
                  src="/images/logo-default.png"
                  alt=""
                  width={140}
                  height={140}
                  aria-hidden="true"
                  className="h-auto w-[110px] min-[375px]:w-[140px]"
                />
              </div>

              <p className="relative font-display italic text-[1.25rem] md:text-[1.4rem] leading-snug text-j-text-heading mb-6">
                {letterOpener}
              </p>

              <p className="relative font-display italic text-[1.05rem] text-j-text-muted mb-8">
                {letterBridge}
              </p>

              <hr
                aria-hidden="true"
                className="relative h-px w-3/5 border-0 bg-gradient-to-r from-transparent via-j-accent/40 to-transparent mb-6"
              />

              <p className="relative font-display italic text-[1.25rem] leading-snug text-j-rose text-center mb-6 whitespace-pre-line">
                {letterClosing}
              </p>

              <Link
                href={`/book/${reading.slug}/intake`}
                aria-label={`${dropCapCta} — go to intake form`}
                className="relative group block w-max max-w-full mx-auto px-4 py-3 font-display italic font-medium text-2xl text-j-deep leading-tight tracking-tight text-center border-b border-transparent hover:border-j-accent transition-colors"
                style={{ minHeight: "56px" }}
              >
                <span
                  aria-hidden="true"
                  className="font-display italic font-medium text-[3rem] leading-none text-j-accent align-[-0.15em] mr-[0.04em] group-hover:text-j-accent-light transition-colors"
                >
                  {ctaFirstChar}
                </span>
                <span>{ctaRest}</span>
              </Link>

              <span className="relative block font-body text-[13px] leading-relaxed text-j-text-muted text-center mt-2 max-w-[320px] mx-auto">
                {dropCapCaption}
              </span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
