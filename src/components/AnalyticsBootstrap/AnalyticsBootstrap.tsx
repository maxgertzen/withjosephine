"use client";

import { useEffect, useState } from "react";

import { ConsentBanner } from "@/components/ConsentBanner";
import { initAnalytics } from "@/lib/analytics";
import { readConsent, writeConsent } from "@/lib/consent";
import type { SanityConsentBanner } from "@/lib/sanity/types";

interface AnalyticsBootstrapProps {
  consentRequired: boolean;
  consentBannerContent?: SanityConsentBanner | null;
  previewMode?: boolean;
}

export function AnalyticsBootstrap({
  consentRequired,
  consentBannerContent,
  previewMode = false,
}: AnalyticsBootstrapProps) {
  const [showBanner, setShowBanner] = useState(previewMode);

  useEffect(() => {
    if (previewMode) return;
    if (!consentRequired) {
      initAnalytics();
      return;
    }
    const choice = readConsent();
    if (choice === "granted") {
      initAnalytics();
      return;
    }
    if (choice === null) {
      // localStorage is mount-only; consent decision can't be made on the server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBanner(true);
    }
  }, [consentRequired, previewMode]);

  function handleAccept() {
    if (previewMode) {
      setShowBanner(false);
      return;
    }
    writeConsent("granted");
    initAnalytics();
    setShowBanner(false);
  }

  function handleDecline() {
    if (previewMode) {
      setShowBanner(false);
      return;
    }
    writeConsent("declined");
    setShowBanner(false);
  }

  if (!showBanner) return null;
  return (
    <ConsentBanner
      onAccept={handleAccept}
      onDecline={handleDecline}
      content={consentBannerContent}
    />
  );
}
