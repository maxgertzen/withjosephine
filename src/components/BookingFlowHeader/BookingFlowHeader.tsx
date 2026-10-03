"use client";

import { NavigationButton } from "@/components/NavigationButton";

import { useHeaderBack } from "./headerBackContext";

type BookingFlowHeaderProps = {
  backHref: string;
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

export function BookingFlowHeader({ backHref, backLabel = "Back" }: BookingFlowHeaderProps) {
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
    <header className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <div className="-mt-3 -ml-2 mb-1">
        {onBack ? (
          <button type="button" onClick={onBack} className={BACK_CLASS}>
            {back}
          </button>
        ) : (
          <NavigationButton href={backHref} className={BACK_CLASS}>
            {back}
          </NavigationButton>
        )}
      </div>
    </header>
  );
}
