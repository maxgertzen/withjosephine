import type { Metadata } from "next";

import { deriveLinksPageViewProps } from "@/app/tt/deriveLinksPageViewProps";
import { linksPageExtras } from "@/app/tt/linksPageExtras";
import { LinksPageView } from "@/app/tt/LinksPageView";
import { fetchLinksPage } from "@/lib/sanity/fetch";

const PREVIEW_SITE_ORIGIN = "";

export const metadata: Metadata = {
  title: "Preview: Josephine's Link Tree",
  robots: { index: false, follow: false },
};

export default async function LinksPagePreview() {
  const state = await fetchLinksPage();
  const props = deriveLinksPageViewProps(state, PREVIEW_SITE_ORIGIN);

  return (
    <LinksPageView
      {...props}
      {...await linksPageExtras(props, state?.page)}
      inStudioPreview
    />
  );
}
