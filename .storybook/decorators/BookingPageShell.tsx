import type { Decorator } from "@storybook/react";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";

// Shared decorator that mirrors the production page-shell from
// src/app/book/[readingId]/intake/page.tsx + src/app/book/[readingId]/gift/page.tsx.
// Importing the REAL BookingFlowHeader + Footer keeps the story chrome in lockstep
// with production (single source of truth). Per-story copy comes from parameters.

type BookingPageShellParameters = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  backHref?: string;
};

export const withBookingPageShell: Decorator = (Story, context) => {
  const params = (context.parameters.bookingPageShell ?? {}) as BookingPageShellParameters;
  const { eyebrow, title, subtitle, backHref } = params;

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <BookingFlowHeader backHref={backHref ?? "#"} />
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <article className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className="relative px-6 py-10 md:px-12 md:py-14">
            {eyebrow ? (
              <p className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-j-accent mb-3">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className="font-display italic font-medium text-[clamp(1.85rem,5vw,2.25rem)] leading-tight text-j-text-heading mb-3">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="font-display italic text-[1.05rem] leading-snug text-j-text-muted max-w-[50ch] mb-10">
                {subtitle}
              </p>
            ) : null}
            <Story />
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};
