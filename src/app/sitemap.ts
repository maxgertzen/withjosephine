import type { MetadataRoute } from "next";

import { generateReadingStaticParams } from "@/data/readings";
import { siteOrigin } from "@/lib/env";
import { isNotesVisible, noteLastModified, notePath, NOTES_PATH } from "@/lib/notes/notes";
import { fetchArticleDatesPublished, fetchNotesStatePublished } from "@/lib/sanity/fetch";

// Public, indexable surfaces only; noindexed and user-scoped routes are excluded.
const STATIC_PATHS = ["/"];

async function notesEntries(origin: string): Promise<MetadataRoute.Sitemap> {
  const [notesState, articles] = await Promise.all([
    fetchNotesStatePublished(),
    fetchArticleDatesPublished(),
  ]);
  if (!isNotesVisible(notesState)) return [];
  const notes = articles.map((article) => ({
    url: new URL(notePath(article.slug), origin).toString(),
    lastModified: noteLastModified(article),
  }));
  const newest = notes
    .map((note) => note.lastModified)
    .filter(Boolean)
    .sort()
    .at(-1);
  return [{ url: new URL(NOTES_PATH, origin).toString(), lastModified: newest }, ...notes];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const [readingParams, notes] = await Promise.all([
    generateReadingStaticParams(),
    notesEntries(origin),
  ]);
  const bookPaths = readingParams.map(({ readingId }) => `/book/${readingId}`);

  return [
    ...[...STATIC_PATHS, ...bookPaths].map((path) => ({
      url: new URL(path, origin).toString(),
    })),
    ...notes,
  ];
}
