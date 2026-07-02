"use client";

import Link from "next/link";

import { NavigationButton } from "@/components/NavigationButton";

import { useHeaderBack } from "./headerBackContext";

type BookingFlowHeaderProps = {
  backHref: string;
  backLabel?: string;
};

const BACK_CLASS =
  "font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-11 px-2 shrink-0";

export function BookingFlowHeader({ backHref, backLabel = "‹ Back" }: BookingFlowHeaderProps) {
  // A client descendant (the intake form) can register an in-page back handler;
  // when present the arrow steps back through the form instead of leaving it.
  const { onBack } = useHeaderBack();
  return (
    <header
      className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 border-b border-j-border-subtle"
      style={{
        paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))",
        paddingBottom: "1rem",
      }}
    >
      {onBack ? (
        <button type="button" onClick={onBack} className={BACK_CLASS}>
          {backLabel}
        </button>
      ) : (
        <NavigationButton href={backHref} className={BACK_CLASS}>
          {backLabel}
        </NavigationButton>
      )}
      <Link
        href="/"
        aria-label="Josephine Soul Readings — home"
        className="font-display italic text-base sm:text-lg md:text-xl text-j-text-heading tracking-wide hover:text-j-accent transition-colors whitespace-nowrap"
      >
        Josephine Soul Readings
      </Link>
      <div className="flex items-center justify-end shrink-0" aria-hidden="true" />
    </header>
  );
}
