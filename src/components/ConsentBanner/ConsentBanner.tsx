"use client";

import Link from "next/link";

import { ROUTES } from "@/lib/constants";

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentBanner({ onAccept, onDecline }: ConsentBannerProps) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-j-border-subtle bg-j-cream shadow-j-soft"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="text-sm leading-relaxed text-j-text">
          <p id="consent-banner-title" className="font-display italic text-base text-j-text-heading">
            A note on analytics
          </p>
          <p className="mt-1 text-sm text-j-text-muted">
            We use Mixpanel to understand how visitors move through the booking flow so
            we can keep improving it. No personal information is shared.{" "}
            <Link
              href={ROUTES.privacy}
              className="text-j-accent underline-offset-2 hover:underline"
            >
              Read the privacy policy
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="rounded-[50px] border border-j-border-subtle px-5 py-2.5 font-body text-sm uppercase tracking-[0.12em] text-j-text-muted transition-colors hover:border-j-text-muted hover:text-j-text"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-[50px] bg-j-bg-interactive px-5 py-2.5 font-body text-sm uppercase tracking-[0.12em] text-j-text-on-dark transition-colors hover:bg-j-midnight"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
