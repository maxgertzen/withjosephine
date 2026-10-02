import type { Metadata } from "next";

import { deriveNotesIndexViewProps } from "@/app/notes/deriveNotesIndexViewProps";
import { NotesIndexView } from "@/app/notes/NotesIndexView";
import { fetchArticles, fetchNotesState, fetchSiteSettings } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: Notes",
  robots: { index: false, follow: false },
};

export default async function NotesIndexPreview() {
  const [notesState, articles, siteSettings] = await Promise.all([
    fetchNotesState(),
    fetchArticles(),
    fetchSiteSettings(),
  ]);

  return <NotesIndexView {...deriveNotesIndexViewProps({ notesState, articles, siteSettings })} />;
}
