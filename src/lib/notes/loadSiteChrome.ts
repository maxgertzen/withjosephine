import type { NotesFooterProps, NotesNavProps } from "@/components/Notes/NotesShell";
import {
  fetchNotesState,
  fetchNotesStatePublished,
  fetchSiteSettings,
  fetchSiteSettingsPublished,
} from "@/lib/sanity/fetch";
import type { ContentPerspective } from "@/lib/sanity/types";

import { notesFooter, notesNav } from "./notesChrome";

export type SiteChrome = { nav: NotesNavProps; footer: NotesFooterProps };

export async function loadSiteChrome(perspective: ContentPerspective = "published"): Promise<SiteChrome> {
  const preview = perspective === "preview";
  const [siteSettings, notesState] = await Promise.all([
    (preview ? fetchSiteSettings() : fetchSiteSettingsPublished()).catch(() => null),
    (preview ? fetchNotesState() : fetchNotesStatePublished()).catch(() => null),
  ]);
  return { nav: notesNav(siteSettings, notesState), footer: notesFooter(siteSettings, notesState) };
}
