import type { Metadata } from "next";

import { LINKS_PAGE_DEFAULTS } from "@/data/defaults";
import { LINKS_PAGE_ORIGIN } from "@/lib/constants";
import { nonBlank } from "@/lib/content/nonBlank";
import {
  fetchLinksPagePublished,
  fetchNotesStatePublished,
  fetchReadingsPublished,
  fetchSiteSettingsPublished,
} from "@/lib/sanity/fetch";
import { buildPageMetadata } from "@/lib/seoMetadata";

import { deriveLinksPageViewProps } from "./deriveLinksPageViewProps";
import { linksPageFontVariables } from "./fonts";
import { LinksPageView } from "./LinksPageView";

export async function generateMetadata(): Promise<Metadata> {
  const state = await fetchLinksPagePublished();
  const seo = state?.page?.seo;
  return {
    ...buildPageMetadata({
      title: nonBlank(seo?.metaTitle) ?? LINKS_PAGE_DEFAULTS.metaTitle,
      description: nonBlank(seo?.metaDescription) ?? LINKS_PAGE_DEFAULTS.metaDescription,
      path: `${LINKS_PAGE_ORIGIN}/`,
      seo,
    }),
    robots: { index: false, follow: true },
  };
}

export default async function LinksPage() {
  const [state, readings, siteSettings, notesState] = await Promise.all([
    fetchLinksPagePublished(),
    fetchReadingsPublished(),
    fetchSiteSettingsPublished(),
    fetchNotesStatePublished(),
  ]);

  return (
    <LinksPageView
      {...deriveLinksPageViewProps({ state, readings, siteSettings, notesState })}
      fontVariables={linksPageFontVariables(state?.page?.nameFont, state?.page?.textFont)}
    />
  );
}
