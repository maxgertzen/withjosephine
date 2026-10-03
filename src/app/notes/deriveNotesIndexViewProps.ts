import { NOTES_INDEX_ILLUSTRATION_URL } from "@/data/defaults";
import { applyTokens } from "@/lib/emails/applyTokens";
import { notePath, notesContent, readingMinutes } from "@/lib/notes/notes";
import { notesFooter, notesNav } from "@/lib/notes/notesChrome";
import { sanityImageUrl } from "@/lib/sanity/imageUrl";
import type {
  SanityArticleSummary,
  SanityNotesState,
  SanitySiteSettings,
} from "@/lib/sanity/types";

import type { NotesIndexViewProps } from "./NotesIndexView";

const ILLUSTRATION_PX = 640;

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
    illustrationUrl: sanityImageUrl(
      notesState?.settings?.indexIllustrationUrl || NOTES_INDEX_ILLUSTRATION_URL,
      { w: ILLUSTRATION_PX },
    ),
    nav: notesNav(siteSettings, notesState),
    footer: notesFooter(siteSettings, notesState),
  };
}
