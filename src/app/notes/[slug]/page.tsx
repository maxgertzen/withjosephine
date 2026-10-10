import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd/JsonLd";
import { ArticleViewTracker } from "@/components/Notes/ArticleViewTracker";
import { isNotesVisible, noteDescription, noteLastModified, notePath } from "@/lib/notes/notes";
import type { NoteImageValue } from "@/lib/notes/types";
import {
  fetchArticlePublished,
  fetchArticleSlugs,
  fetchNotesStatePublished,
  fetchSiteSettingsPublished,
} from "@/lib/sanity/fetch";
import { sanityImageUrl } from "@/lib/sanity/imageUrl";
import type { SanityArticle } from "@/lib/sanity/types";
import { buildPageMetadata, pageTitle } from "@/lib/seoMetadata";
import { articleJsonLd } from "@/lib/structuredData";

import { deriveNoteViewProps } from "./deriveNoteViewProps";
import { NoteView } from "./NoteView";

type NotePageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return fetchArticleSlugs();
}

function shareImageUrl(article: SanityArticle): string | undefined {
  const url = article.body?.find((block): block is NoteImageValue => block._type === "image")?.url;
  return url && sanityImageUrl(url, { w: 1200, h: 630, fit: "crop" });
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticlePublished(slug);
  if (!article) return {};
  const image = shareImageUrl(article);
  return buildPageMetadata({
    title: pageTitle(article.title),
    description: noteDescription(article),
    path: notePath(slug),
    seo: image ? { ogImage: { asset: { url: image } } } : undefined,
  });
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params;
  const [article, notesState, siteSettings] = await Promise.all([
    fetchArticlePublished(slug),
    fetchNotesStatePublished(),
    fetchSiteSettingsPublished(),
  ]);
  if (!article || !isNotesVisible(notesState)) notFound();

  const jsonLd = articleJsonLd({
    headline: article.title,
    description: noteDescription(article),
    path: notePath(slug),
    datePublished: article.publishedAt,
    dateModified: noteLastModified(article) ?? article.publishedAt,
    image: shareImageUrl(article),
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <NoteView {...deriveNoteViewProps({ article, notesState, siteSettings })} />
      <ArticleViewTracker note={slug} />
    </>
  );
}
