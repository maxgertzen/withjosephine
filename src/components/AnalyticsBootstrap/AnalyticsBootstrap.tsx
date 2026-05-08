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
  const [showBanner, setShowBanner] = useState(
    previewMode && consentBannerContent?.hideInPreview !== true,
  );
  const [observabilityLive, setObservabilityLive] = useState(false);
  const consentEffectRanRef = useRef(false);

  useEffect(() => {
    if (previewMode) return;
    if (consentEffectRanRef.current) return;
    consentEffectRanRef.current = true;
    if (!consentRequired) {
      bootstrapClientObservability();
      clarityConsent(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObservabilityLive(true);
      return;
    }
    const choice = readConsent();
    if (choice === "granted") {
      bootstrapClientObservability();
      clarityConsent(true);
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
    clarityConsent(true);
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
