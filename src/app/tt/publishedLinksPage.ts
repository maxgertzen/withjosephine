import "server-only";

import { fetchLinksPagePublished } from "@/lib/sanity/fetch";

import { deriveLinksPageViewProps } from "./deriveLinksPageViewProps";
import type { LinksPageButton } from "./LinksPageView";

export async function publishedLinksPageButtons(): Promise<LinksPageButton[]> {
  return deriveLinksPageViewProps(await fetchLinksPagePublished(), "").buttons;
}

export async function publishedEmailFirstButton(key: string): Promise<LinksPageButton | null> {
  const state = await fetchLinksPagePublished();
  if (state?.page?.showPage !== true) return null;
  const button = deriveLinksPageViewProps(state, "").buttons.find((candidate) => candidate.key === key);
  return button?.askForEmail ? button : null;
}
