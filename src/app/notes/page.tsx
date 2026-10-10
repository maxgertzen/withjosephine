import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isNotesVisible, NOTES_PATH, notesContent } from "@/lib/notes/notes";
import {
  fetchArticlesPublished,
  fetchNotesStatePublished,
  fetchSiteSettingsPublished,
} from "@/lib/sanity/fetch";
import { buildPageMetadata, pageTitle } from "@/lib/seoMetadata";

import { deriveNotesIndexViewProps } from "./deriveNotesIndexViewProps";
import { NotesIndexView } from "./NotesIndexView";

export async function generateMetadata(): Promise<Metadata> {
  const content = notesContent(await fetchNotesStatePublished());
  return buildPageMetadata({
    title: pageTitle(content.indexTitle),
    description: content.indexSearchDescription,
    path: NOTES_PATH,
  });
}

export default async function NotesIndexPage() {
  const [notesState, articles, siteSettings] = await Promise.all([
    fetchNotesStatePublished(),
    fetchArticlesPublished(),
    fetchSiteSettingsPublished(),
  ]);
  if (!isNotesVisible(notesState)) notFound();

  return <NotesIndexView {...deriveNotesIndexViewProps({ notesState, articles, siteSettings })} />;
}
