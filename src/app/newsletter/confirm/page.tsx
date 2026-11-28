import type { Metadata } from "next";

import { fetchSiteSettingsPublished } from "@/lib/sanity/fetch";
import { pageTitle } from "@/lib/seoMetadata";
import { newsletterContent } from "@/lib/signup/newsletterContent";

import { NewsletterConfirmView, type NewsletterConfirmViewState } from "./NewsletterConfirmView";

async function publishedNewsletterWords() {
  return newsletterContent((await fetchSiteSettingsPublished().catch(() => null))?.newsletter);
}

export async function generateMetadata(): Promise<Metadata> {
  const words = await publishedNewsletterWords();
  return { title: pageTitle(words.title), robots: { index: false, follow: false } };
}

function viewState(params: { token?: string; status?: string }): NewsletterConfirmViewState {
  if (params.status === "confirmed") return { kind: "confirmed" };
  if (params.status !== "failed" && params.token) return { kind: "ask", token: params.token };
  return { kind: "failed" };
}

export default async function NewsletterConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const [params, words] = await Promise.all([searchParams, publishedNewsletterWords()]);
  return <NewsletterConfirmView words={words} state={viewState(params)} />;
}
