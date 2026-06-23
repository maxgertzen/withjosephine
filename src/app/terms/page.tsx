import type { Metadata } from "next";

import { LegalPageLayout, TermsFallbackBody } from "@/components/LegalPageLayout";
import { PortableTextContent } from "@/components/PortableTextContent";
import { buildLegalMetadata, type LegalPageFallback, resolveLegalPage } from "@/lib/legalPage";
import { fetchLegalPagePublished } from "@/lib/sanity/fetch";

const SLUG = "terms";
const FALLBACK: LegalPageFallback = {
  tag: "✦ Terms",
  title: "Terms of Service",
  lastUpdated: "2026-04-15",
  metaTitle: "Terms of Service · Josephine",
  metaDescription:
    "The agreement between you and Josephine when you book a soul reading: what's delivered, how, and the limits of it.",
};

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalMetadata(SLUG, FALLBACK, fetchLegalPagePublished);
}

export default async function TermsPage() {
  const { doc, tag, title, lastUpdated } = await resolveLegalPage(
    SLUG,
    FALLBACK,
    fetchLegalPagePublished,
  );

  return (
    <LegalPageLayout tag={tag} title={title} lastUpdated={lastUpdated}>
      {doc?.body?.length ? <PortableTextContent value={doc.body} /> : <TermsFallbackBody />}
    </LegalPageLayout>
  );
}
