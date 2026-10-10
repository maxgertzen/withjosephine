import type { ReactNode } from "react";

import {
  PrivacyFallbackBody,
  RefundPolicyFallbackBody,
  TermsFallbackBody,
} from "@/components/LegalPageLayout";

import type { LegalPageFallback } from "./legalPage";
import type { LegalSlug } from "./legalSlugs";
import { pageTitle } from "./seoMetadata";

export { isLegalSlug, type LegalSlug } from "./legalSlugs";

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
      lastUpdated: "2026-10-04",
      metaTitle: pageTitle("Privacy Policy"),
      metaDescription:
        "How Josephine collects, uses, and protects the information you share when booking a soul reading.",
    },
    FallbackBody: PrivacyFallbackBody,
  },
  terms: {
    fallback: {
      tag: "✦ Terms",
      title: "Terms of Service",
      lastUpdated: "2026-10-04",
      metaTitle: pageTitle("Terms of Service"),
      metaDescription:
        "The agreement between you and Josephine when you book a soul reading: what's delivered, how, and the limits of it.",
    },
    FallbackBody: TermsFallbackBody,
  },
  "refund-policy": {
    fallback: {
      tag: "✦ Refunds",
      title: "Refund Policy",
      lastUpdated: "2026-10-04",
      metaTitle: pageTitle("Refund Policy"),
      metaDescription:
        "Readings are non-refundable. How the cooling-off waiver works, and how duplicate-charge and delivery-issue cases are handled.",
    },
    FallbackBody: RefundPolicyFallbackBody,
  },
};
