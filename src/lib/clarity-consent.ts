"use client";

import type { ClarityWindow, ConsentDimension } from "./clarity";

// Microsoft Clarity Consent API v2 (mandatory since Oct 31, 2025 for
// EEA/UK/CH visitors — sessions without an explicit consent signal are
// dropped server-side). Calling this before the Clarity tag finishes
// loading is safe: the bootstrap snippet stages a `window.clarity()`
// queue at init and replays buffered calls on tag-load.
//
// `ad_Storage` is hardcoded to "denied" — the site does not run ads, so
// there's no scenario where ad-targeting cookies would be wanted. Only
// `analytics_Storage` reflects the visitor's accept/decline.
//
// Docs: learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2

export function clarityConsent(granted: boolean): void {
  if (typeof window === "undefined") return;
  const w = window as ClarityWindow;
  if (typeof w.clarity !== "function") return;
  const decision: ConsentDimension = granted ? "granted" : "denied";
  w.clarity("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: decision,
  });
}
