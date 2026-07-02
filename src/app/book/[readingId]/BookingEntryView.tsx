import { Check, Clock, Mic } from "lucide-react";

import { EntryPageView, TrackedLink } from "@/components/BookingAnalytics";
import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";
import { ReadingIcon } from "@/components/ReadingIcon";
import { BOOKING_PAGE_ROUTES } from "@/lib/http/routes";

export type BookingEntryReading = {
  slug: string;
  tag: string;
  name: string;
  priceLabel: string;
  shortDescription: string;
  includedItems: string[];
};

export type BookingEntryCopy = {
  changeReadingLinkText: string;
  deliveryNote: string;
  deliverableNote: string;
  whatsIncludedHeading: string;
  bookReadingCtaText: string;
};

export type BookingEntryViewProps = {
  reading: BookingEntryReading;
  copy: BookingEntryCopy;
};

export function BookingEntryView({ reading, copy }: BookingEntryViewProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <BookingFlowHeader backHref="/#readings" />

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-12 md:gap-x-16 md:gap-y-12 md:[grid-template-rows:auto_auto]">
          <div className="flex flex-col md:row-start-1 md:col-start-1">
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

            <TrackedLink
              href="/#readings"
              event="change_reading_click"
              properties={{ from_reading_id: reading.slug }}
              className="inline-block self-start font-display italic text-base text-j-text border-b border-j-border-gold pb-px hover:text-j-text-heading hover:border-j-accent transition-colors"
            >
              <em>{copy.changeReadingLinkText}</em>
            </TrackedLink>
          </div>

          <div className="md:row-start-1 md:col-start-2">
            <div className="relative flex items-center justify-center min-h-[260px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 m-auto h-[260px] w-[260px] rounded-full border border-j-accent/[0.12]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 m-auto h-[200px] w-[200px] rounded-full border border-j-accent/[0.08]"
              />
              <ReadingIcon
                slug={reading.slug}
                className="relative w-[160px] h-[160px] md:w-[200px] md:h-[200px]"
              />
            </div>
          </div>

          <div className="md:row-start-2 md:col-start-1">
            <h2 className="font-body text-[0.75rem] font-semibold tracking-[0.2em] uppercase text-j-text-muted mb-4">
              {copy.whatsIncludedHeading}
            </h2>
            <ul className="space-y-2 mb-6">
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

            <div className="flex flex-col gap-3 p-5 border border-j-border-subtle rounded-md bg-j-blush/[0.18]">
              <div className="flex gap-3 items-start font-body text-sm text-j-text leading-snug">
                <Clock
                  className="w-4 h-4 text-j-accent shrink-0 mt-0.5"
                  aria-hidden="true"
                  strokeWidth={1.5}
                />
                <span>{copy.deliveryNote}</span>
              </div>
              <div className="flex gap-3 items-start font-body text-sm text-j-text leading-snug">
                <Mic
                  className="w-4 h-4 text-j-accent shrink-0 mt-0.5"
                  aria-hidden="true"
                  strokeWidth={1.5}
                />
                <span>{copy.deliverableNote}</span>
              </div>
            </div>
          </div>

          <div className="md:row-start-2 md:col-start-2 md:self-start flex flex-col gap-3 items-center">
            <TrackedLink
              href={BOOKING_PAGE_ROUTES.letter(reading.slug)}
              event="cta_click_intake"
              properties={{ reading_id: reading.slug, position: "verso-cta" }}
              className="inline-flex items-center justify-center min-h-14 min-w-[14rem] w-full md:w-auto px-10 py-4 bg-j-deep text-j-cream rounded-[50px] font-display italic font-medium text-base hover:bg-j-midnight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent"
            >
              {copy.bookReadingCtaText}
            </TrackedLink>
          </div>
        </div>
      </main>

      <EntryPageView readingId={reading.slug} />
      <Footer />
    </div>
  );
}
