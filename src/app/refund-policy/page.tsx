import type { Metadata } from "next";

import { LegalPageLayout, RefundPolicyFallbackBody } from "@/components/LegalPageLayout";
import { PortableTextContent } from "@/components/PortableTextContent";
import { buildLegalMetadata, type LegalPageFallback, resolveLegalPage } from "@/lib/legalPage";

const SLUG = "refund-policy";
const FALLBACK: LegalPageFallback = {
  tag: "✦ Refunds",
  title: "Refund Policy",
  lastUpdated: "2026-05-19",
  metaTitle: "Refund Policy · Josephine",
  metaDescription:
    "Readings are non-refundable. How the cooling-off waiver works, and how duplicate-charge and delivery-issue cases are handled.",
};

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalMetadata(SLUG, FALLBACK);
}

export default async function RefundPolicyPage() {
  const { doc, tag, title, lastUpdated } = await resolveLegalPage(SLUG, FALLBACK);

  return (
    <LegalPageLayout tag={tag} title={title} lastUpdated={lastUpdated}>
      {doc?.body?.length ? (
        <PortableTextContent value={doc.body} />
      ) : (
        <RefundPolicyFallbackBody />
      )}
    </LegalPageLayout>
  );
}
