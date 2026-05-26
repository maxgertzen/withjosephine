import type { Metadata } from "next";

import { LibraryView } from "../_shared/LibraryView";
import { loadLibraryData } from "../_shared/loadLibraryData";

export const metadata: Metadata = {
  title: "Your gifts, Josephine",
  description: "Every reading you've sent, gathered in one quiet place.",
  robots: { index: false, follow: false },
};

/**
 * Deep-link entry point for the gifts tab. Renders the unified library RSC
 * with `defaultTab="gifts"` so a direct visit lands on the gifts panel. The
 * client view stays the same component; only the initial tab differs.
 */
export default async function MyReadingsGiftsPage({
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
      defaultTab="gifts"
    />
  );
}
