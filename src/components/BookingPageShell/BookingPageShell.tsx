import type { ReactNode } from "react";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";

export type BookingPageShellProps = {
  backHref: string;
  aboutLinkText?: string;
  outerBg?: "cream" | "ivory";
  variant?: "standard" | "letter";
  children: ReactNode;
};

const OUTER_BG_CLASS: Record<NonNullable<BookingPageShellProps["outerBg"]>, string> = {
  cream: "bg-j-cream",
  ivory: "bg-j-ivory",
};

const VARIANT_CLASS: Record<
  NonNullable<BookingPageShellProps["variant"]>,
  { maxW: string; shadow: string; contentPadding: string }
> = {
  standard: {
    maxW: "max-w-3xl",
    shadow: "shadow-j-card",
    contentPadding: "px-6 py-10 md:px-12 md:py-14",
  },
  letter: {
    maxW: "max-w-2xl",
    shadow: "shadow-j-soft",
    contentPadding: "px-6 py-12 md:px-10 md:py-14",
  },
};

export function BookingPageShell({
  backHref,
  aboutLinkText,
  outerBg = "cream",
  variant = "standard",
  children,
}: BookingPageShellProps) {
  const v = VARIANT_CLASS[variant];
  return (
    <div className={`relative min-h-screen ${OUTER_BG_CLASS[outerBg]} overflow-hidden`}>
      <BookingFlowHeader backHref={backHref} aboutLinkText={aboutLinkText} />

      <main className={`relative z-10 ${v.maxW} mx-auto px-6 py-16`}>
        <article className={`relative bg-j-ivory border border-j-blush rounded-sm ${v.shadow}`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className={`relative ${v.contentPadding}`}>{children}</div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
