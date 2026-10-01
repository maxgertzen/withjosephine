"use client";

import { NavigationButton } from "@/components/NavigationButton";

import { useHeaderBack } from "./headerBackContext";

type BookingFlowHeaderProps = {
  backHref: string;
  readingTag?: string;
  readingName?: string;
  readingPrice?: string;
  backLabel?: string;
};

const BACK_CLASS =
  "relative z-20 font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center gap-1.5 min-h-11 px-2 shrink-0";

function BackChevron() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 9 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M7.5 1 1.5 7l6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookingFlowHeader({
  backHref,
  readingTag,
  readingName,
  readingPrice,
  backLabel = "Back",
}: BookingFlowHeaderProps) {
  // A client descendant (the intake form) can register an in-page back handler;
  // when present the arrow steps back through the form instead of leaving it.
  const { onBack } = useHeaderBack();
  const back = (
    <>
      <BackChevron />
      {backLabel}
    </>
  );

  return (
    <header
      className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 flex items-center min-h-[116px] md:min-h-[150px] border-b border-j-border-subtle"
      style={{
        paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))",
        paddingBottom: "1rem",
      }}
    >
      {onBack ? (
        <button type="button" onClick={onBack} className={BACK_CLASS}>
          {back}
        </button>
      ) : (
        <NavigationButton href={backHref} className={BACK_CLASS}>
          {back}
        </NavigationButton>
      )}

      {/* Absolute centring, not flex/grid: both let Back's width push the block
          off centre (measured 35px and 7px respectively on the long names). */}
      {readingName ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center pointer-events-none">
          {readingTag ? (
            <span className="font-body uppercase text-j-text-gold text-[0.6rem] tracking-[0.18em] md:text-[0.68rem] md:tracking-[0.22em]">
              {readingTag}
            </span>
          ) : null}
          <span className="font-display font-light italic leading-tight text-j-text-heading whitespace-nowrap text-[1.25rem] md:text-[2.4rem] mt-1 md:mt-2">
            {readingName}
          </span>
          {readingPrice ? (
            <span className="font-display italic text-j-text-gold md:text-j-text-gold-lg text-[1rem] md:text-[1.5rem] mt-0.5 md:mt-2">
              {readingPrice}
            </span>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
