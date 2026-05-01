"use client";

import { useEffect, useState } from "react";

import { ConsentBanner } from "@/components/ConsentBanner";
import { initAnalytics } from "@/lib/analytics";
import { readConsent, writeConsent } from "@/lib/consent";

interface AnalyticsBootstrapProps {
  consentRequired: boolean;
}

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
      // localStorage is mount-only; consent decision can't be made on the server.
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
