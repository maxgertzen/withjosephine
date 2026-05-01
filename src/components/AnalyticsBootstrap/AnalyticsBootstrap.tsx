"use client";

import { useEffect, useState } from "react";

import { ConsentBanner } from "@/components/ConsentBanner";
import { initAnalytics } from "@/lib/analytics";
import { readConsent, writeConsent } from "@/lib/consent";

interface AnalyticsBootstrapProps {
  consentRequired: boolean;
}

/**
 * Decides whether to init Mixpanel + whether to render the consent
 * banner. Wired into root `layout.tsx`, runs once on the client.
 *
 * Three cases:
 * 1. `consentRequired === false` (visitor outside EU/EEA/UK/CH/CA)
 *    → init analytics immediately on mount, no banner.
 * 2. `consentRequired === true` and visitor previously chose
 *    → respect the choice from localStorage; init iff `granted`.
 * 3. `consentRequired === true` and no prior choice
 *    → render banner; init only after Accept click. Decline path
 *      writes `declined` so the banner stays dismissed forever.
 */
export function AnalyticsBootstrap({ consentRequired }: AnalyticsBootstrapProps) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
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
      // setState in effect is intentional here: localStorage is only
      // available after mount, so the banner-vs-no-banner decision
      // can't be made on the server. One synchronous setState on
      // mount, no cascade — exactly what the rule warns against in
      // the general case but not what we're doing.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBanner(true);
    }
  }, [consentRequired]);

  function handleAccept() {
    writeConsent("granted");
    initAnalytics();
    setShowBanner(false);
  }

  function handleDecline() {
    writeConsent("declined");
    setShowBanner(false);
  }

  if (!showBanner) return null;
  return <ConsentBanner onAccept={handleAccept} onDecline={handleDecline} />;
}
