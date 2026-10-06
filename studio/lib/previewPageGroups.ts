import { GIFT_PREVIEW_LINKS } from "@/lib/page-previews/preview-fixtures-pages";

type PageLink = { title: string; href: string };
export type PageGroup = { title: string; pages: PageLink[] };
type SluggedDoc = { title: string; slug: string };
type PreviewPageDocs = { readings: SluggedDoc[]; notes: SluggedDoc[]; legal: SluggedDoc[] };

export function pageGroups(docs: PreviewPageDocs): PageGroup[] {
  return [
    {
      title: "Site",
      pages: [
        { title: "Home", href: "/preview" },
        { title: "Notes", href: "/preview/notes" },
      ],
    },
    { title: "Notes", pages: docs.notes.map((note) => ({ title: note.title, href: `/preview/notes/${note.slug}` })) },
    {
      title: "Booking pages",
      pages: docs.readings.map((reading) => ({ title: reading.title, href: `/preview/book/${reading.slug}` })),
    },
    {
      title: "Thank-you pages",
      pages: docs.readings.map((reading) => ({ title: reading.title, href: `/preview/thank-you/${reading.slug}` })),
    },
    { title: "Gift pages", pages: GIFT_PREVIEW_LINKS },
    {
      title: "Other pages",
      pages: [
        ...docs.legal.map((page) => ({ title: page.title, href: `/preview/${page.slug}` })),
        { title: "Page not found", href: "/preview/404" },
        { title: "Under construction", href: "/preview/under-construction" },
      ],
    },
  ].filter((group) => group.pages.length > 0);
}
