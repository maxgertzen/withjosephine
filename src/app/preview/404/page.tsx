import type { Metadata } from "next";

import { NotFoundView } from "@/components/NotFoundView";
import { NOT_FOUND_PAGE_DEFAULTS } from "@/data/defaults";
import { withNonBlankOverrides } from "@/lib/content/nonBlank";
import { fetchNotFoundPage } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: 404 Page",
  robots: { index: false, follow: false },
};

export default async function NotFoundPagePreview() {
  const content = withNonBlankOverrides(NOT_FOUND_PAGE_DEFAULTS, await fetchNotFoundPage());

  return <NotFoundView content={content} />;
}
