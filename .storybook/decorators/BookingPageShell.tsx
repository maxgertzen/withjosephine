import type { Decorator } from "@storybook/react";

import { BookingPageHeading } from "@/components/BookingPageHeading";
import { BookingPageShell } from "@/components/BookingPageShell";

// Storybook decorator that wraps the story with the canonical production
// page-shell. The actual chrome (header + article + gold border + footer)
// lives in src/components/BookingPageShell so this stays in lockstep with
// every consuming route automatically. Per-story copy comes from
// parameters.bookingPageShell.

type BookingPageShellParameters = {
  title?: string;
  subtitle?: string;
  backHref?: string;
  readingTag?: string;
  readingName?: string;
  readingPrice?: string;
};

export const withBookingPageShell: Decorator = (Story, context) => {
  const params = (context.parameters.bookingPageShell ?? {}) as BookingPageShellParameters;
  const { title, subtitle, backHref, readingTag, readingName, readingPrice } = params;

  return (
    <BookingPageShell
      backHref={backHref ?? "#"}
      readingTag={readingTag ?? "Signature"}
      readingName={readingName ?? "Soul Blueprint"}
      readingPrice={readingPrice ?? "$129"}
    >
      {title ? <BookingPageHeading title={title} /> : null}
      {subtitle ? (
        <p className="font-body text-base leading-[1.9] font-light text-j-text max-w-[50ch] mb-10">
          {subtitle}
        </p>
      ) : null}
      <Story />
    </BookingPageShell>
  );
};
