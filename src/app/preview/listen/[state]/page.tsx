import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListenView } from "@/app/(authed)/listen/[id]/ListenView";
import { LISTEN_PAGE_DEFAULTS } from "@/data/defaults";
import { LISTEN_FIXTURES } from "@/lib/page-previews/preview-fixtures-pages";
import { fetchListenPage } from "@/lib/sanity/fetch";
import { pickDefined } from "@/lib/sanity/pickDefined";

export const metadata: Metadata = {
  title: "Preview: Listen Page",
  robots: { index: false, follow: false },
};

export default async function ListenPagePreview({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const fixture = LISTEN_FIXTURES[state];
  if (!fixture) notFound();
  const sanity = await fetchListenPage();
  return <ListenView copy={{ ...LISTEN_PAGE_DEFAULTS, ...pickDefined(sanity ?? {}) }} state={fixture} />;
}
