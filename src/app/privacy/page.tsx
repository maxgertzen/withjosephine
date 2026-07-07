import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/LegalPageLayout";
import { PortableTextContent } from "@/components/PortableTextContent";
import { buildLegalMetadata, resolveLegalPage } from "@/lib/legalPage";
import { LEGAL_PAGES } from "@/lib/legalPages";
import { fetchLegalPageFresh } from "@/lib/sanity/fetch";

const SLUG = "privacy";
const { fallback, FallbackBody } = LEGAL_PAGES[SLUG];

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalMetadata(SLUG, fallback, fetchLegalPageFresh);
}

export default async function PrivacyPage() {
  const { doc, tag, title, lastUpdated } = await resolveLegalPage(
    SLUG,
    fallback,
    fetchLegalPageFresh,
  );

  return (
    <LegalPageLayout tag={tag} title={title} lastUpdated={lastUpdated}>
      {doc?.body?.length ? <PortableTextContent value={doc.body} /> : <FallbackBody />}
    </LegalPageLayout>
  );
}
