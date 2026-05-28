import type { Metadata } from "next";

import { LibraryView } from "./_shared/LibraryView";
import { loadLibraryData } from "./_shared/loadLibraryData";

export const metadata: Metadata = {
  title: "Your readings, Josephine",
  description: "Your readings and gifts, gathered in one quiet place.",
  robots: { index: false, follow: false },
};

export default async function MyReadingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;
  const data = await loadLibraryData({ justSent: params.sent === "1" });
  return (
    <LibraryView
      state={data.state}
      readingsCopy={data.readingsCopy}
      giftsCopy={data.giftsCopy}
    />
  );
}
