import type { NotesNavProps } from "@/components/Notes/NotesShell";
import { fetchNotesStatePublished, fetchSiteSettingsPublished } from "@/lib/sanity/fetch";

import { notesNav } from "./notesChrome";

export async function loadNotesNav(): Promise<NotesNavProps> {
  const [siteSettings, notesState] = await Promise.all([
    fetchSiteSettingsPublished().catch(() => null),
    fetchNotesStatePublished().catch(() => null),
  ]);
  return notesNav(siteSettings, notesState);
}
