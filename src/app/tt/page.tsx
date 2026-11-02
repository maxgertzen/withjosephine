import type { Metadata } from "next";

import { LINKS_PAGE_DEFAULTS } from "@/data/defaults";
import { LINKS_PAGE_ORIGIN } from "@/lib/constants";
import { nonBlank } from "@/lib/content/nonBlank";
import { buildTimeSiteOrigin } from "@/lib/env";
import { tapCounterPath } from "@/lib/links/linksHostRouting";
import { fetchLinksPagePublished } from "@/lib/sanity/fetch";
import { buildPageMetadata } from "@/lib/seoMetadata";

import { deriveLinksPageViewProps } from "./deriveLinksPageViewProps";
import { linksPageExtras } from "./linksPageExtras";
import { LinksPageView } from "./LinksPageView";
import { LinksPageViewTracking } from "./LinksPageViewTracking";

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
  const state = await fetchLinksPagePublished();
  const siteOrigin = buildTimeSiteOrigin();
  const props = deriveLinksPageViewProps(state, siteOrigin);
  const buttons = props.buttons.map((button) =>
    button.countsTaps ? { ...button, href: `${siteOrigin}${tapCounterPath(button.key)}` } : button,
  );

  return (
    <>
      <LinksPageView
        {...props}
        buttons={buttons}
        {...await linksPageExtras(props, state?.page)}
      />
      <LinksPageViewTracking />
    </>
  );
}
