import "server-only";

import { fetchLinksPagePublished } from "@/lib/sanity/fetch";

import { deriveLinksPageViewProps } from "./deriveLinksPageViewProps";
import type { LinksPageButton } from "./LinksPageView";

export async function publishedLinksPageButtons(): Promise<LinksPageButton[]> {
  return deriveLinksPageViewProps(await fetchLinksPagePublished(), "").buttons;
}
