"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ClarityRouteTracking } from "@/components/ClarityRouteTracking";
import { ClarityScript } from "@/components/ClarityScript";
import { ConsentBanner } from "@/components/ConsentBanner";
import { initAnalytics } from "@/lib/analytics";
import { isClarityBlockedPath } from "@/lib/clarityGate";
import { readConsent, thirdPartyContentAllowed, writeConsent } from "@/lib/consent";
import type { SanityConsentBanner } from "@/lib/sanity/types";
import { initSentryClient } from "@/lib/sentry-client";

function bootstrapClientObservability(): void {
  initAnalytics();
  initSentryClient();
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
  const clarityBlocked = isClarityBlockedPath(pathname ?? "");
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
    if (thirdPartyContentAllowed()) {
      bootstrapClientObservability();
      setObservabilityLive(true);
      return;
    }
    if (readConsent() === null) {
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
      {observabilityLive && !clarityBlocked ? (
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
