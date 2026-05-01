"use client";

import Link from "next/link";

import { ROUTES } from "@/lib/constants";
import type { SanityConsentBanner } from "@/lib/sanity/types";

const DEFAULTS = {
  title: "A note on analytics",
  body:
    "We use Mixpanel to understand how visitors move through the booking flow so we can keep improving it. No personal information is shared.",
  privacyLinkText: "Read the privacy policy",
  acceptLabel: "Accept",
  declineLabel: "Decline",
};

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
  content?: SanityConsentBanner | null;
}

export function ConsentBanner({ onAccept, onDecline, content }: ConsentBannerProps) {
  const title = content?.title || DEFAULTS.title;
  const body = content?.body || DEFAULTS.body;
  const privacyLinkText = content?.privacyLinkText || DEFAULTS.privacyLinkText;
  const acceptLabel = content?.acceptLabel || DEFAULTS.acceptLabel;
  const declineLabel = content?.declineLabel || DEFAULTS.declineLabel;

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
            {title}
          </p>
          <p className="mt-1 text-sm text-j-text-muted">
            {body}{" "}
            <Link
              href={ROUTES.privacy}
              className="text-j-accent underline-offset-2 hover:underline"
            >
              {privacyLinkText}
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="cursor-pointer rounded-[50px] border border-j-border-subtle px-5 py-2.5 font-body text-sm uppercase tracking-[0.12em] text-j-text-muted transition-colors hover:border-j-text-muted hover:text-j-text"
          >
            {declineLabel}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="cursor-pointer rounded-[50px] bg-j-bg-interactive px-5 py-2.5 font-body text-sm uppercase tracking-[0.12em] text-j-text-on-dark transition-colors hover:bg-j-midnight"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
