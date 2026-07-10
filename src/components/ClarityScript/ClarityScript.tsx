"use client";

import Clarity from "@microsoft/clarity";
import { useEffect } from "react";

import { clarityConsent } from "@/lib/clarity-consent";
import { shouldEnableClientObservability } from "@/lib/observability-gate";

export function ClarityScript() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (!projectId) return;
    if (!shouldEnableClientObservability(window.location.host)) return;
    // init() stages the window.clarity queue then injects the tag; consent
    // must follow init. This component only mounts once consent is granted or
    // not required (see AnalyticsBootstrap), so signal analytics-granted here.
    Clarity.init(projectId);
    clarityConsent(true);
  }, []);

  return null;
}
