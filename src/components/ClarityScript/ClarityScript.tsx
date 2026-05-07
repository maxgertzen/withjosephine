"use client";

import Script from "next/script";

import { shouldEnableClientObservability } from "@/lib/observability-gate";

export function ClarityScript() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;
  if (!shouldEnableClientObservability(window.location.host)) return null;

  // External-src form (NOT the official inline IIFE) so the strict CSP's
  // `script-src 'self' 'nonce-…'` doesn't block us — inline scripts in
  // a "use client" subtree don't inherit the per-request nonce. Clarity's
  // tag URL self-bootstraps recording on load; we don't make any
  // `clarity()` queue calls ourselves, so the IIFE wrapper is unnecessary.
  return (
    <Script
      id="ms-clarity"
      src={`https://www.clarity.ms/tag/${projectId}`}
      strategy="afterInteractive"
    />
  );
}
