import type { Metadata } from "next";

import { deriveLinksPageViewProps } from "@/app/tt/deriveLinksPageViewProps";
import { linksPageExtras } from "@/app/tt/linksPageExtras";
import { LinksPageView } from "@/app/tt/LinksPageView";
import { fetchLinksPage, fetchNotesState, fetchReadings, fetchSiteSettings } from "@/lib/sanity/fetch";

const PREVIEW_SITE_ORIGIN = "";

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

  const props = deriveLinksPageViewProps({
    state,
    readings,
    siteSettings,
    notesState,
    siteOrigin: PREVIEW_SITE_ORIGIN,
  });

  return (
    <LinksPageView
      {...props}
      {...await linksPageExtras(props, state?.page)}
    />
  );
}
