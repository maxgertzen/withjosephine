import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/LegalPageLayout";
import { PortableTextContent } from "@/components/PortableTextContent";
import { resolveLegalPage } from "@/lib/legalPage";
import { isLegalSlug, LEGAL_PAGES } from "@/lib/legalPages";

type LegalPreviewProps = {
  params: Promise<{ legalSlug: string }>;
};

export const metadata: Metadata = {
  title: "Preview: Legal Page",
  robots: { index: false, follow: false },
};

export default async function LegalPagePreview({ params }: LegalPreviewProps) {
  const { legalSlug } = await params;

  if (!isLegalSlug(legalSlug)) {
    return (
      <p className="font-body text-base text-j-text-muted p-8">
        Preview unavailable: unknown legal page &ldquo;{legalSlug}&rdquo;.
      </p>
    );
  }

  const { fallback, FallbackBody } = LEGAL_PAGES[legalSlug];
  const { doc, tag, title, lastUpdated } = await resolveLegalPage(legalSlug, fallback);

  return (
    <LegalPageLayout tag={tag} title={title} lastUpdated={lastUpdated}>
      {doc?.body?.length ? <PortableTextContent value={doc.body} /> : <FallbackBody />}
    </LegalPageLayout>
  );
}
