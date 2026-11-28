import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VerifyPageView } from "@/app/auth/verify/VerifyPageView";
import { MAGIC_LINK_VERIFY_PAGE_DEFAULTS } from "@/data/defaults";
import { withNonBlankOverrides } from "@/lib/content/nonBlank";
import { VERIFY_FIXTURES } from "@/lib/page-previews/preview-fixtures-pages";
import { fetchMagicLinkVerifyPage } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: Sign-in Link Page",
  robots: { index: false, follow: false },
};

export default async function SignInLinkPagePreview({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const fixture = VERIFY_FIXTURES[state];
  if (!fixture) notFound();
  const sanity = await fetchMagicLinkVerifyPage();
  return <VerifyPageView copy={withNonBlankOverrides(MAGIC_LINK_VERIFY_PAGE_DEFAULTS, sanity)} state={fixture} />;
}
