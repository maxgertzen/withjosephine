import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  LegalPageLayout,
  PrivacyFallbackBody,
  RefundPolicyFallbackBody,
  TermsFallbackBody,
} from "@/components/LegalPageLayout";
import { PortableTextContent } from "@/components/PortableTextContent";
import { type LegalPageFallback, resolveLegalPage } from "@/lib/legalPage";

type LegalPreviewSlug = "privacy" | "terms" | "refund-policy";

const LEGAL_PREVIEW: Record<
  LegalPreviewSlug,
  { fallback: LegalPageFallback; body: () => ReactNode }
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
    body: PrivacyFallbackBody,
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
    body: TermsFallbackBody,
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
    body: RefundPolicyFallbackBody,
  },
};

function isLegalPreviewSlug(value: string): value is LegalPreviewSlug {
  return value === "privacy" || value === "terms" || value === "refund-policy";
}

type LegalPreviewProps = {
  params: Promise<{ legalSlug: string }>;
};

export const metadata: Metadata = {
  title: "Preview: Legal Page",
  robots: { index: false, follow: false },
};

export default async function LegalPagePreview({ params }: LegalPreviewProps) {
  const { legalSlug } = await params;

  if (!isLegalPreviewSlug(legalSlug)) {
    return (
      <p className="font-body text-base text-j-text-muted p-8">
        Preview unavailable: unknown legal page &ldquo;{legalSlug}&rdquo;.
      </p>
    );
  }

  const { fallback, body: FallbackBody } = LEGAL_PREVIEW[legalSlug];
  const { doc, tag, title, lastUpdated } = await resolveLegalPage(legalSlug, fallback);

  return (
    <LegalPageLayout tag={tag} title={title} lastUpdated={lastUpdated}>
      {doc?.body?.length ? <PortableTextContent value={doc.body} /> : <FallbackBody />}
    </LegalPageLayout>
  );
}
