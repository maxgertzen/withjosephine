import Link from "next/link";

import { AccountMenu } from "@/components/AccountMenu";
import { NavigationButton } from "@/components/NavigationButton";

type BookingFlowHeaderProps = {
  backHref: string;
  backLabel?: string;
};

export function BookingFlowHeader({ backHref, backLabel = "‹ Back" }: BookingFlowHeaderProps) {
  return (
    <header
      className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 border-b border-j-border-subtle"
      style={{
        paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))",
        paddingBottom: "1rem",
      }}
    >
      <NavigationButton
        href={backHref}
        className="font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-11 px-2 shrink-0"
      >
        {backLabel}
      </NavigationButton>
      <Link
        href="/"
        aria-label="Josephine Soul Readings — home"
        className="font-display italic text-base sm:text-lg md:text-xl text-j-text-heading tracking-wide hover:text-j-accent transition-colors whitespace-nowrap"
      >
        Josephine Soul Readings
      </Link>
      <div className="flex items-center justify-end shrink-0">
        <AccountMenu />
      </div>
    </header>
  );
}
