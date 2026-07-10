"use client";

import Clarity from "@microsoft/clarity";

import type { ConsentDimension } from "./clarity";

// Must run AFTER Clarity.init() so the consentv2 signal is buffered on the
// window.clarity queue rather than dropped. ad_Storage is always denied (no ads).
export function clarityConsent(granted: boolean): void {
  const decision: ConsentDimension = granted ? "granted" : "denied";
  Clarity.consentV2({
    ad_Storage: "denied",
    analytics_Storage: decision,
  });
}
