import type { Metadata } from "next";

import { LINKS_PAGE_DEFAULTS } from "@/data/defaults";
import { LINKS_PAGE_ORIGIN } from "@/lib/constants";
import { nonBlank } from "@/lib/content/nonBlank";
import { buildTimeSiteOrigin } from "@/lib/env";
import { tapCounterPath } from "@/lib/links/linksHostRouting";
import { fetchLinksPagePublished } from "@/lib/sanity/fetch";
import { buildPageMetadata } from "@/lib/seoMetadata";

import { deriveLinksPageViewProps } from "./deriveLinksPageViewProps";
import { linksPageFontVariables } from "./fonts";
import { LinksPageView } from "./LinksPageView";
import { LinksPageViewTracking } from "./LinksPageViewTracking";
import { fetchPublishedLinksPageInputs } from "./publishedLinksPage";

const MAIL_APP_OPENS_ONLY_FROM_A_DIRECT_LINK = "email";

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
  const inputs = await fetchPublishedLinksPageInputs();
  const siteOrigin = buildTimeSiteOrigin();
  const props = deriveLinksPageViewProps({ ...inputs, siteOrigin });
  const buttons = props.buttons.map((button) =>
    button.destination === MAIL_APP_OPENS_ONLY_FROM_A_DIRECT_LINK
      ? button
      : { ...button, href: `${siteOrigin}${tapCounterPath(button.key)}` },
  );

  return (
    <>
      <LinksPageView
        {...props}
        buttons={buttons}
        fontVariables={linksPageFontVariables(inputs.state?.page?.nameFont, inputs.state?.page?.textFont)}
      />
      <LinksPageViewTracking />
    </>
  );
}
