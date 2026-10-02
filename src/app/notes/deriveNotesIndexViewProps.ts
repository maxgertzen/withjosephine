import { applyTokens } from "@/lib/emails/applyTokens";
import { notePath, notesContent, readingMinutes } from "@/lib/notes/notes";
import { notesFooter } from "@/lib/notes/notesFooter";
import type {
  SanityArticleSummary,
  SanityNotesState,
  SanitySiteSettings,
} from "@/lib/sanity/types";

import type { NotesIndexViewProps } from "./NotesIndexView";

export function deriveNotesIndexViewProps(input: {
  notesState: SanityNotesState | null;
  articles: SanityArticleSummary[];
  siteSettings: SanitySiteSettings | null;
}): NotesIndexViewProps {
  const { notesState, articles, siteSettings } = input;
  const content = notesContent(notesState);
  return {
    title: content.indexTitle,
    subtitle: content.indexSubtitle,
    notes: articles.map((article) => ({
      title: article.title,
      subtitle: article.subtitle,
      href: notePath(article.slug),
      readingTime: applyTokens(content.readingTimeTemplate, {
        minutes: readingMinutes(article.wordCount),
      }),
    })),
    footer: notesFooter(siteSettings, notesState),
  };
}
