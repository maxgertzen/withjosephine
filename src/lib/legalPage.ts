import type { Metadata } from "next";

import { fetchLegalPage } from "@/lib/sanity/fetch";
import type { SanityLegalPage } from "@/lib/sanity/types";
import { buildPageMetadata } from "@/lib/seoMetadata";

// Public legal pages pass the published fetcher (static/ISR); the /preview
// legal route uses the default live fetcher (draft-aware).
type LegalFetcher = (slug: string) => Promise<SanityLegalPage | null>;

export type LegalPageFallback = {
  tag: string;
  title: string;
  lastUpdated: string;
  metaTitle: string;
  metaDescription: string;
};

export type ResolvedLegalPage = {
  doc: SanityLegalPage | null;
  tag: string;
  title: string;
  lastUpdated: string;
};

export function formatLegalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function resolveLegalPage(
  slug: string,
  fallback: LegalPageFallback,
  fetcher: LegalFetcher = fetchLegalPage,
): Promise<ResolvedLegalPage> {
  const doc = await fetcher(slug);
  return {
    doc,
    tag: doc?.tag ?? fallback.tag,
    title: doc?.title ?? fallback.title,
    lastUpdated: formatLegalDate(doc?.lastUpdated ?? fallback.lastUpdated),
  };
}

export async function buildLegalMetadata(
  slug: string,
  fallback: LegalPageFallback,
  fetcher: LegalFetcher = fetchLegalPage,
): Promise<Metadata> {
  const doc = await fetcher(slug);
  const title = doc?.seo?.metaTitle ?? fallback.metaTitle;
  const description = doc?.seo?.metaDescription ?? fallback.metaDescription;
  return buildPageMetadata({ title, description, path: `/${slug}`, seo: doc?.seo });
}
