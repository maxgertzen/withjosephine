import type { ReactNode } from "react";

import {
  PrivacyFallbackBody,
  RefundPolicyFallbackBody,
  TermsFallbackBody,
} from "@/components/LegalPageLayout";

import type { LegalPageFallback } from "./legalPage";

export type LegalSlug = "privacy" | "terms" | "refund-policy";

// Single source for legal-page fallback metadata + body, shared by the public
// routes (published) and the /preview/[legalSlug] route (draft) so they cannot
// drift.
export const LEGAL_PAGES: Record<
  LegalSlug,
  { fallback: LegalPageFallback; FallbackBody: () => ReactNode }
> = {
  privacy: {
    fallback: {
      tag: "✦ Privacy",
      title: "Privacy Policy",
      lastUpdated: "2026-04-15",
      metaTitle: "Privacy Policy · Josephine",
      metaDescription:
        "How Josephine collects, uses, and protects the information you share when booking a soul reading.",
    },
    FallbackBody: PrivacyFallbackBody,
  },
  terms: {
    fallback: {
      tag: "✦ Terms",
      title: "Terms of Service",
      lastUpdated: "2026-04-15",
      metaTitle: "Terms of Service · Josephine",
      metaDescription:
        "The agreement between you and Josephine when you book a soul reading: what's delivered, how, and the limits of it.",
    },
    FallbackBody: TermsFallbackBody,
  },
  "refund-policy": {
    fallback: {
      tag: "✦ Refunds",
      title: "Refund Policy",
      lastUpdated: "2026-05-19",
      metaTitle: "Refund Policy · Josephine",
      metaDescription:
        "Readings are non-refundable. How the cooling-off waiver works, and how duplicate-charge and delivery-issue cases are handled.",
    },
    FallbackBody: RefundPolicyFallbackBody,
  },
};

export function isLegalSlug(value: string): value is LegalSlug {
  return value === "privacy" || value === "terms" || value === "refund-policy";
}
