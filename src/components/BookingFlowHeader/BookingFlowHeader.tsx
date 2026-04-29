import Link from "next/link";

import { NavigationButton } from "@/components/NavigationButton";

type BookingFlowHeaderProps = {
  backHref: string;
  backLabel?: string;
  aboutLinkText?: string;
};

export function BookingFlowHeader({
  backHref,
  backLabel = "‹ Back",
  aboutLinkText = "About Josephine",
}: BookingFlowHeaderProps) {
  return (
    <header
      className="relative z-10 max-w-5xl mx-auto px-6 flex items-center justify-between border-b border-j-border-subtle"
      style={{
        paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))",
        paddingBottom: "1rem",
      }}
    >
      <NavigationButton
        href={backHref}
        className="font-body text-sm text-j-text-muted hover:text-j-text-heading transition-colors inline-flex items-center min-h-11 px-2"
      >
        {backLabel}
      </NavigationButton>
      <span className="font-display italic text-lg md:text-xl text-j-text-heading tracking-wide">
        Josephine Soul Readings
      </span>
      <Link
        href="/#about"
        className="font-display italic text-sm text-j-text-muted hover:text-j-text transition-colors inline-flex items-center min-h-11 px-2"
        scroll={true}
      >
        {aboutLinkText}
      </Link>
    </header>
  );
}
