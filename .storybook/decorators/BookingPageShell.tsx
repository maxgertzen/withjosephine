import type { Decorator } from "@storybook/react";

import { BookingPageHeading } from "@/components/BookingPageHeading";
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
      <BookingPageHeading eyebrow={eyebrow} title={title} />
      {subtitle ? (
        <p className="font-display italic text-[1.05rem] leading-snug text-j-text-muted max-w-[50ch] mb-10">
          {subtitle}
        </p>
      ) : null}
      <Story />
    </BookingPageShell>
  );
};
