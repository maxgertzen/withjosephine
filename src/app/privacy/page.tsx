import type { Metadata } from "next";

import { LegalPageLayout, PrivacyFallbackBody } from "@/components/LegalPageLayout";
import { PortableTextContent } from "@/components/PortableTextContent";
import { buildLegalMetadata, type LegalPageFallback, resolveLegalPage } from "@/lib/legalPage";

const SLUG = "privacy";
const FALLBACK: LegalPageFallback = {
  tag: "✦ Privacy",
  title: "Privacy Policy",
  lastUpdated: "2026-04-15",
  metaTitle: "Privacy Policy · Josephine",
  metaDescription:
    "How Josephine collects, uses, and protects the information you share when booking a soul reading.",
};

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalMetadata(SLUG, FALLBACK);
}

export default async function PrivacyPage() {
  const { doc, tag, title, lastUpdated } = await resolveLegalPage(SLUG, FALLBACK);

  return (
    <LegalPageLayout tag={tag} title={title} lastUpdated={lastUpdated}>
      {doc?.body?.length ? <PortableTextContent value={doc.body} /> : <PrivacyFallbackBody />}
    </LegalPageLayout>
  );
}
