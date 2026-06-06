import type { Decorator } from "@storybook/react";

import { BookingPageShell } from "@/components/BookingPageShell";

// Storybook decorator that wraps the story with the canonical production
// page-shell. The actual chrome (header + article + gold border + footer)
// lives in src/components/BookingPageShell so this stays in lockstep with
// every consuming route automatically. Per-story copy comes from
// parameters.bookingPageShell.

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
    <BookingPageShell backHref={backHref ?? "#"}>
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
    </BookingPageShell>
  );
};
