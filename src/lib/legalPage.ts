import type { Metadata } from "next";
import { fetchLegalPage } from "@/lib/sanity/fetch";
import type { SanityLegalPage } from "@/lib/sanity/types";

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

export function formatLegalDate(value: string): string {
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
): Promise<ResolvedLegalPage> {
  const doc = await fetchLegalPage(slug);
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
): Promise<Metadata> {
  const doc = await fetchLegalPage(slug);
  return {
    title: doc?.seo?.metaTitle ?? fallback.metaTitle,
    description: doc?.seo?.metaDescription ?? fallback.metaDescription,
  };
}
