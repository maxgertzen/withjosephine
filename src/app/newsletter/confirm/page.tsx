import type { Metadata } from "next";

import { fetchSiteSettingsPublished } from "@/lib/sanity/fetch";
import { pageTitle } from "@/lib/seoMetadata";
import { newsletterContent } from "@/lib/signup/newsletterContent";

import { NewsletterConfirmView, type NewsletterConfirmViewState } from "./NewsletterConfirmView";

export const metadata: Metadata = {
  title: pageTitle("Newsletter"),
  robots: { index: false, follow: false },
};

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
  const [params, settings] = await Promise.all([searchParams, fetchSiteSettingsPublished().catch(() => null)]);
  return <NewsletterConfirmView words={newsletterContent(settings?.newsletter)} state={viewState(params)} />;
}
