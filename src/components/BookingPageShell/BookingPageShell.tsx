import type { ReactNode } from "react";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";

export type BookingPageShellProps = {
  backHref: string;
  readingTag: string;
  readingName: string;
  readingPrice: string;
  outerBg?: "cream" | "ivory";
  children: ReactNode;
};

const OUTER_BG_CLASS: Record<NonNullable<BookingPageShellProps["outerBg"]>, string> = {
  cream: "bg-j-cream",
  ivory: "bg-j-ivory",
};

export function BookingPageShell({
  backHref,
  readingTag,
  readingName,
  readingPrice,
  outerBg = "cream",
  children,
}: BookingPageShellProps) {
  return (
    <div className={`relative min-h-screen ${OUTER_BG_CLASS[outerBg]} overflow-hidden`}>
      <BookingFlowHeader
        backHref={backHref}
        readingTag={readingTag}
        readingName={readingName}
        readingPrice={readingPrice}
      />

      <main id="main" className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <article className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className="relative px-6 py-10 md:px-12 md:py-14">{children}</div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
