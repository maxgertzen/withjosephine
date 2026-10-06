"use client";

import type { ReactNode } from "react";

import { NavigationButton } from "@/components/NavigationButton";
import { useBackLink } from "@/lib/navigation/previousPage";

import { useHeaderBack } from "./headerBackContext";

type BackControlProps = {
  backHref: string;
  backLabel?: string;
};

const BACK_CLASS =
  "relative z-20 -ml-2 font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center gap-1.5 min-h-11 px-2 shrink-0";

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

function BackToPreviousPage({
  fallbackHref,
  children,
}: {
  fallbackHref: string;
  children: ReactNode;
}) {
  const backLink = useBackLink(fallbackHref);
  return (
    <NavigationButton {...backLink} className={BACK_CLASS}>
      {children}
    </NavigationButton>
  );
}

export function BackControl({ backHref, backLabel = "Back" }: BackControlProps) {
  const { onBack } = useHeaderBack();
  const back = (
    <>
      <BackChevron />
      {backLabel}
    </>
  );

  return onBack ? (
    <button type="button" onClick={onBack} className={BACK_CLASS}>
      {back}
    </button>
  ) : (
    <BackToPreviousPage fallbackHref={backHref}>{back}</BackToPreviousPage>
  );
}

export function BookingFlowHeader(props: BackControlProps) {
  return (
    <header className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-6">
      <div className="-mt-3 mb-1">
        <BackControl {...props} />
      </div>
    </header>
  );
}
