import type { Metadata } from "next";

import { deriveLinksPageViewProps } from "@/app/tt/deriveLinksPageViewProps";
import { linksPageFontVariables } from "@/app/tt/fonts";
import { LinksPageView } from "@/app/tt/LinksPageView";
import { fetchLinksPage, fetchNotesState, fetchReadings, fetchSiteSettings } from "@/lib/sanity/fetch";

const SAME_ORIGIN_SO_LINKS_STAY_IN_PREVIEW = "";

export const metadata: Metadata = {
  title: "Preview: TikTok links",
  robots: { index: false, follow: false },
};

export default async function LinksPagePreview() {
  const [state, readings, siteSettings, notesState] = await Promise.all([
    fetchLinksPage(),
    fetchReadings(),
    fetchSiteSettings(),
    fetchNotesState(),
  ]);

  return (
    <LinksPageView
      {...deriveLinksPageViewProps({
        state,
        readings,
        siteSettings,
        notesState,
        siteOrigin: SAME_ORIGIN_SO_LINKS_STAY_IN_PREVIEW,
      })}
      fontVariables={linksPageFontVariables(state?.page?.nameFont, state?.page?.textFont)}
    />
  );
}
