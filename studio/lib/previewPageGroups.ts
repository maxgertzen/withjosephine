import { getPublishedId, isDraftId } from "@sanity/client/csm";

import { isReadingOnSite, OFF_THE_SITE_LABEL } from "../../src/lib/booking/readingVisibility";
import {
  GIFT_PREVIEW_LINKS,
  giftRecipientPreviewLinks,
  LISTEN_PREVIEW_LINKS,
  SIGN_IN_LINK_PREVIEW_LINKS,
} from "@/lib/page-previews/preview-fixtures-pages";

type PageLink = { title: string; href: string };
export type PageGroup = { title: string; pages: PageLink[] };
type SluggedDoc = { _id: string; title: string; slug: string };
type ReadingDoc = SluggedDoc & { onSite?: boolean | null };
export type PreviewPageDocs = { readings: ReadingDoc[]; notes: SluggedDoc[]; legal: SluggedDoc[] };

function latestPerDocument<T extends SluggedDoc>(docs: T[]): (T & { published: boolean })[] {
  const byId = new Map<string, T & { published: boolean }>();
  const publishedIds = new Set(docs.filter(({ _id }) => !isDraftId(_id)).map(({ _id }) => _id));
  for (const doc of docs) {
    const id = getPublishedId(doc._id);
    if (byId.has(id) && !isDraftId(doc._id)) continue;
    byId.set(id, { ...doc, published: publishedIds.has(id) });
  }
  return [...byId.values()];
}

function labelled(doc: { title: string; published: boolean }, offSite = false) {
  const notes = [doc.published ? null : "not published", offSite ? OFF_THE_SITE_LABEL.toLowerCase() : null].filter(Boolean);
  return notes.length > 0 ? `${doc.title} (${notes.join(", ")})` : doc.title;
}

export function pageGroups(docs: PreviewPageDocs): PageGroup[] {
  const readings = latestPerDocument(docs.readings).map((reading) => ({
    ...reading,
    label: labelled(reading, !isReadingOnSite(reading)),
  }));
  const notes = latestPerDocument(docs.notes);
  const legal = latestPerDocument(docs.legal);
  return [
    {
      title: "Site",
      pages: [
        { title: "Home", href: "/preview" },
        { title: "Notes", href: "/preview/notes" },
      ],
    },
    { title: "Notes", pages: notes.map((note) => ({ title: labelled(note), href: `/preview/notes/${note.slug}` })) },
    {
      title: "Booking pages",
      pages: readings.map((reading) => ({ title: reading.label, href: `/preview/book/${reading.slug}` })),
    },
    {
      title: "Thank-you pages",
      pages: readings.map((reading) => ({ title: reading.label, href: `/preview/thank-you/${reading.slug}` })),
    },
    {
      title: "Gift recipient views",
      pages: readings.flatMap((reading) => giftRecipientPreviewLinks(reading.slug, reading.label)),
    },
    { title: "Gift pages", pages: GIFT_PREVIEW_LINKS },
    { title: "Listen page", pages: LISTEN_PREVIEW_LINKS },
    { title: "Sign-in link page", pages: SIGN_IN_LINK_PREVIEW_LINKS },
    {
      title: "Other pages",
      pages: [
        ...legal.map((page) => ({ title: labelled(page), href: `/preview/${page.slug}` })),
        { title: "Page not found", href: "/preview/404" },
        { title: "Under construction", href: "/preview/under-construction" },
      ],
    },
  ].filter((group) => group.pages.length > 0);
}
