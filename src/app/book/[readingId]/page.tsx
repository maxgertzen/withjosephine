import { Check, Clock, Mic } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";
import { NavigationButton } from "@/components/NavigationButton";
import { ReadingIcon } from "@/components/ReadingIcon";
import { BOOKING_INFO_DEFAULTS, ENTRY_PAGE_DEFAULTS } from "@/data/defaults";
import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { BOOKING_ROUTES } from "@/lib/booking/constants";
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
  const changeReadingLinkText =
    entry.changeReadingLinkText ?? ENTRY_PAGE_DEFAULTS.changeReadingLinkText;
  const aboutJosephineLinkText =
    entry.aboutJosephineLinkText ?? ENTRY_PAGE_DEFAULTS.aboutJosephineLinkText;

  const deliveryNote = bookingPage?.deliveryNote ?? BOOKING_INFO_DEFAULTS.deliveryNote;
  const deliverableNote = bookingPage?.formatNote ?? BOOKING_INFO_DEFAULTS.deliverableNote;

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <BookingFlowHeader backHref="/#readings" aboutLinkText={aboutJosephineLinkText} />

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-12 md:items-start mb-12">
          <div className="flex flex-col">
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
              className="inline-block self-start font-display italic text-base text-j-text border-b border-j-border-gold pb-px hover:text-j-text-heading hover:border-j-accent transition-colors"
            >
              <em>{changeReadingLinkText}</em>
            </Link>
          </div>

          <div className="relative flex items-center justify-center min-h-[280px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto h-[280px] w-[280px] rounded-full border border-j-accent/[0.12]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto h-[220px] w-[220px] rounded-full border border-j-accent/[0.08]"
            />
            <ReadingIcon
              slug={reading.slug}
              className="relative w-[180px] h-[180px] md:w-[220px] md:h-[220px]"
            />
          </div>
        </div>

        <div className="max-w-2xl mx-auto flex flex-col">
          <hr className="h-px w-full max-w-[280px] border-0 bg-gradient-to-r from-transparent via-j-accent/50 to-transparent mb-8" />

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

          <div className="flex flex-col gap-3 p-6 border border-j-border-subtle rounded-md bg-j-blush/[0.18] mb-10">
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

          <NavigationButton
            href={BOOKING_ROUTES.letter(reading.slug)}
            className="self-center inline-flex items-center justify-center min-h-14 min-w-[14rem] px-10 py-4 bg-j-deep text-j-cream rounded-[50px] font-display italic font-medium text-base hover:bg-j-midnight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent"
          >
            Book this Reading →
          </NavigationButton>
        </div>
      </main>

      <Footer />
    </div>
  );
}
