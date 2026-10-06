import { ABOUT_DEFAULTS } from "@/data/defaults";
import { nonBlank } from "@/lib/content/nonBlank";
import { applyTokens } from "@/lib/emails/applyTokens";
import { bookingPath } from "@/lib/http/routes";
import {
  formatMonthYear,
  noteLastModified,
  notePath,
  notesContent,
} from "@/lib/notes/notes";
import { notesFooter, notesNav } from "@/lib/notes/notesChrome";
import type { NoteSummary } from "@/lib/notes/types";
import { sanityImageUrl } from "@/lib/sanity/imageUrl";
import type { SanityArticle, SanityNotesState, SanitySiteSettings } from "@/lib/sanity/types";

import type { NoteEnding, NoteViewProps } from "./NoteView";

const MORE_NOTES_LIMIT = 2;
const AUTHOR_PHOTO_PX = 210;

function pickedNotes(article: SanityArticle): NoteSummary[] {
  return (article.moreNotes ?? [])
    .filter((note): note is NoteSummary => Boolean(note?.slug) && note?.slug !== article.slug)
    .slice(0, MORE_NOTES_LIMIT);
}

export function deriveNoteViewProps(input: {
  article: SanityArticle;
  notesState: SanityNotesState | null;
  siteSettings: SanitySiteSettings | null;
}): NoteViewProps {
  const { article, notesState, siteSettings } = input;
  const content = notesContent(notesState);
  const reading = article.relatedReading;
  const picked = pickedNotes(article);
  const otherNotesCount = (notesState?.publishedCount ?? 0) - 1;
  const authorPhoto = notesState?.settings?.authorPhotoUrl || ABOUT_DEFAULTS.imageUrl;
  const lastModified = noteLastModified(article);

  const ending: NoteEnding | undefined =
    reading?.slug && !article.hideReadingBox
      ? {
          leadIn: article.hideCardLeadIn ? undefined : content.cardLeadIn,
          readingName: reading.name,
          readingSlug: reading.slug,
          price: nonBlank(reading.priceDisplay),
          line: nonBlank(reading.valueProposition),
          button: content.cardButton,
          href: bookingPath(reading.slug),
        }
      : undefined;
  const seeAll = otherNotesCount > picked.length ? content.seeAllLabel : undefined;
  const showMoreNotes = !article.hideMoreNotes && (picked.length > 0 || Boolean(seeAll));

  return {
    slug: article.slug,
    backLabel: content.backLabel,
    title: article.title,
    subtitle: article.subtitle,
    author: {
      name: content.authorName,
      line: content.authorLine,
      photoUrl: notesState?.settings?.hideAuthorPhoto
        ? undefined
        : sanityImageUrl(authorPhoto, { w: AUTHOR_PHOTO_PX }),
    },
    listen: article.audioUrl
      ? {
          src: article.audioUrl,
          label: content.listenLabel,
          length: article.audioMinutes
            ? applyTokens(content.listenLengthTemplate, { minutes: article.audioMinutes })
            : undefined,
        }
      : undefined,
    body: article.body ?? [],
    signOff: content.signOff,
    updated: lastModified
      ? applyTokens(content.updatedTemplate, { date: formatMonthYear(lastModified) })
      : undefined,
    ending,
    moreNotes: showMoreNotes
      ? {
          label: content.moreNotesLabel,
          notes: picked.map((note) => ({ ...note, href: notePath(note.slug) })),
          seeAll,
        }
      : undefined,
    nav: notesNav(siteSettings, notesState),
    footer: notesFooter(siteSettings, notesState),
  };
}
