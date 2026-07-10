"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ClarityRouteTracking } from "@/components/ClarityRouteTracking";
import { ClarityScript } from "@/components/ClarityScript";
import { ConsentBanner } from "@/components/ConsentBanner";
import { initAnalytics } from "@/lib/analytics";
import { readConsent, writeConsent } from "@/lib/consent";
import { CONSENT_REQUIRED_COOKIE } from "@/lib/region";
import type { SanityConsentBanner } from "@/lib/sanity/types";
import { initSentryClient } from "@/lib/sentry-client";

function bootstrapClientObservability(): void {
  initAnalytics();
  initSentryClient();
}

function consentRequiredFromCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((entry) => entry.trim() === `${CONSENT_REQUIRED_COOKIE}=1`);
}

interface AnalyticsBootstrapProps {
  consentBannerContent?: SanityConsentBanner | null;
}

export function AnalyticsBootstrap({ consentBannerContent }: AnalyticsBootstrapProps) {
  // The layout is static, so previewMode and the region consent flag are
  // resolved client-side: previewMode from the route, consent from the cookie
  // middleware sets per request.
  const pathname = usePathname();
  const previewMode = pathname?.startsWith("/preview") ?? false;
  const [showBanner, setShowBanner] = useState(false);
  const [observabilityLive, setObservabilityLive] = useState(false);
  const consentEffectRanRef = useRef(false);

  useEffect(() => {
    if (consentEffectRanRef.current) return;
    consentEffectRanRef.current = true;
    if (previewMode) {
      if (consentBannerContent?.hideInPreview !== true) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowBanner(true);
      }
      return;
    }
    if (!consentRequiredFromCookie()) {
      bootstrapClientObservability();
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
      setShowBanner(true);
    }
  }, [previewMode, consentBannerContent]);

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
