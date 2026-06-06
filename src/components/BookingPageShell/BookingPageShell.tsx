import type { ReactNode } from "react";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";

export type BookingPageShellProps = {
  backHref: string;
  aboutLinkText?: string;
  outerBg?: "cream" | "ivory";
  maxW?: "2xl" | "3xl";
  shadow?: "soft" | "card";
  contentPadding?: "default" | "letter";
  children: ReactNode;
};

const OUTER_BG_CLASS: Record<NonNullable<BookingPageShellProps["outerBg"]>, string> = {
  cream: "bg-j-cream",
  ivory: "bg-j-ivory",
};

const MAX_W_CLASS: Record<NonNullable<BookingPageShellProps["maxW"]>, string> = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

const SHADOW_CLASS: Record<NonNullable<BookingPageShellProps["shadow"]>, string> = {
  card: "shadow-j-card",
  soft: "shadow-j-soft",
};

const CONTENT_PADDING_CLASS: Record<NonNullable<BookingPageShellProps["contentPadding"]>, string> = {
  default: "px-6 py-10 md:px-12 md:py-14",
  letter: "px-6 py-12 md:px-10 md:py-14",
};

export function BookingPageShell({
  backHref,
  aboutLinkText,
  outerBg = "cream",
  maxW = "3xl",
  shadow = "card",
  contentPadding = "default",
  children,
}: BookingPageShellProps) {
  return (
    <div className={`relative min-h-screen ${OUTER_BG_CLASS[outerBg]} overflow-hidden`}>
      <BookingFlowHeader backHref={backHref} aboutLinkText={aboutLinkText} />

      <main className={`relative z-10 ${MAX_W_CLASS[maxW]} mx-auto px-6 py-16`}>
        <article className={`relative bg-j-ivory border border-j-blush rounded-sm ${SHADOW_CLASS[shadow]}`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className={`relative ${CONTENT_PADDING_CLASS[contentPadding]}`}>{children}</div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
