import "server-only";

import { fetchLinksPagePublished } from "@/lib/sanity/fetch";

import { deriveLinksPageViewProps } from "./deriveLinksPageViewProps";
import type { LinksPageButton } from "./LinksPageView";

export async function publishedLinksPageButtons(): Promise<LinksPageButton[]> {
  return deriveLinksPageViewProps(await fetchLinksPagePublished(), "").buttons;
}

export async function publishedEmailFirstSignup(
  key: string,
): Promise<{ button: LinksPageButton; newsletterOn: boolean } | null> {
  const state = await fetchLinksPagePublished();
  if (state?.page?.showPage !== true) return null;
  const { buttons, newsletterConsent } = deriveLinksPageViewProps(state, "");
  const button = buttons.find((candidate) => candidate.key === key);
  return button?.askForEmail ? { button, newsletterOn: newsletterConsent !== null } : null;
}
