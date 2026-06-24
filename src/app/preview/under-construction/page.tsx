import type { Metadata } from "next";

import { UnderConstruction } from "@/components/UnderConstruction";
import { fetchUnderConstructionPage } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: Under Construction",
  robots: { index: false, follow: false },
};

export default async function UnderConstructionPreview() {
  const content = await fetchUnderConstructionPage();

  return <UnderConstruction content={content} />;
}
