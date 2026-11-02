import "server-only";

import {
  fetchLinksPagePublished,
  fetchNotesStatePublished,
  fetchReadingsPublished,
  fetchSiteSettingsPublished,
} from "@/lib/sanity/fetch";

import { deriveLinksPageViewProps } from "./deriveLinksPageViewProps";
import type { LinksPageButton } from "./LinksPageView";

export async function fetchPublishedLinksPageInputs() {
  const [state, readings, siteSettings, notesState] = await Promise.all([
    fetchLinksPagePublished(),
    fetchReadingsPublished(),
    fetchSiteSettingsPublished(),
    fetchNotesStatePublished(),
  ]);
  return { state, readings, siteSettings, notesState };
}

export async function publishedLinksPageButtons(): Promise<LinksPageButton[]> {
  const inputs = await fetchPublishedLinksPageInputs();
  return deriveLinksPageViewProps({ ...inputs, siteOrigin: "" }).buttons;
}
