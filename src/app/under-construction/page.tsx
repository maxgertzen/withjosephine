import type { Metadata } from "next";

import { UnderConstruction } from "@/components/UnderConstruction";
import { fetchUnderConstructionPagePublished } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function UnderConstructionPage() {
  const content = await fetchUnderConstructionPagePublished();
  return <UnderConstruction content={content} />;
}
