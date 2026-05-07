"use client";

import { useEffect, useRef, useState } from "react";

import { ClarityRouteTracking } from "@/components/ClarityRouteTracking";
import { ClarityScript } from "@/components/ClarityScript";
import { ConsentBanner } from "@/components/ConsentBanner";
import { initAnalytics } from "@/lib/analytics";
import { clarityConsent } from "@/lib/clarity-consent";
import { readConsent, writeConsent } from "@/lib/consent";
import type { SanityConsentBanner } from "@/lib/sanity/types";
import { initSentryClient } from "@/lib/sentry-client";

function bootstrapClientObservability(): void {
  initAnalytics();
  initSentryClient();
  // Clarity Consent API v2 — required for EEA/UK/CH since Oct 31, 2025.
  // The Clarity bootstrap snippet stages a window.clarity() queue, so this
  // call is buffered and replayed once the tag finishes loading.
  clarityConsent(true);
}

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
  const [observabilityLive, setObservabilityLive] = useState(false);
  const consentEffectRanRef = useRef(false);

  useEffect(() => {
    if (previewMode) return;
    if (consentEffectRanRef.current) return;
    consentEffectRanRef.current = true;
    if (!consentRequired) {
      bootstrapClientObservability();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObservabilityLive(true);
      return;
    }
    const choice = readConsent();
    if (choice === "granted") {
      bootstrapClientObservability();
      setObservabilityLive(true);
      return;
    }
    if (choice === null) {
      // localStorage is mount-only; consent decision can't be made on the server.
      setShowBanner(true);
    }
  }, [consentRequired, previewMode]);

  function handleAccept() {
    if (previewMode) {
      setShowBanner(false);
      return;
    }
    writeConsent("granted");
    bootstrapClientObservability();
    setObservabilityLive(true);
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

  return (
    <>
      {observabilityLive ? (
        <>
          <ClarityScript />
          <ClarityRouteTracking />
        </>
      ) : null}
      {showBanner ? (
        <ConsentBanner
          onAccept={handleAccept}
          onDecline={handleDecline}
          content={consentBannerContent}
        />
      ) : null}
    </>
  );
}
