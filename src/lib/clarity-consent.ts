"use client";

import type { ClarityWindow } from "./clarity";

// Microsoft Clarity Consent API v2 (mandatory since Oct 31, 2025 for
// EEA/UK/CH visitors — sessions without an explicit consent signal are
// dropped server-side). Calling this before the Clarity tag finishes
// loading is safe: the bootstrap snippet stages a `window.clarity()`
// queue at init and replays buffered calls on tag-load.
//
// Docs: learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2

export function clarityConsent(granted: boolean): void {
  if (typeof window === "undefined") return;
  const w = window as ClarityWindow;
  if (typeof w.clarity !== "function") return;
  w.clarity("consent", granted);
}
