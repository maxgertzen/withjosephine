import type { NotesNavProps } from "@/components/Notes/NotesShell";
import {
  fetchNotesState,
  fetchNotesStatePublished,
  fetchSiteSettings,
  fetchSiteSettingsPublished,
} from "@/lib/sanity/fetch";
import type { ContentPerspective } from "@/lib/sanity/types";

import { notesNav } from "./notesChrome";

export async function loadNotesNav(
  perspective: ContentPerspective = "published",
): Promise<NotesNavProps> {
  const preview = perspective === "preview";
  const [siteSettings, notesState] = await Promise.all([
    (preview ? fetchSiteSettings() : fetchSiteSettingsPublished()).catch(() => null),
    (preview ? fetchNotesState() : fetchNotesStatePublished()).catch(() => null),
  ]);
  return notesNav(siteSettings, notesState);
}
