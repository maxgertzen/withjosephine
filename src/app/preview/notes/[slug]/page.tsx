import type { Metadata } from "next";

import { deriveNoteViewProps } from "@/app/notes/[slug]/deriveNoteViewProps";
import { NoteView } from "@/app/notes/[slug]/NoteView";
import { fetchArticle, fetchNotesState, fetchSiteSettings } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: Note",
  robots: { index: false, follow: false },
};

type NotePreviewProps = { params: Promise<{ slug: string }> };

export default async function NotePreview({ params }: NotePreviewProps) {
  const { slug } = await params;
  const [article, notesState, siteSettings] = await Promise.all([
    fetchArticle(slug),
    fetchNotesState(),
    fetchSiteSettings(),
  ]);

  if (!article) {
    return (
      <p className="font-body text-base text-j-text-muted p-8">
        Preview unavailable: no note found for &ldquo;{slug}&rdquo;.
      </p>
    );
  }

  return <NoteView {...deriveNoteViewProps({ article, notesState, siteSettings })} />;
}
