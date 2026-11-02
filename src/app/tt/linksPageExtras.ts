import "server-only";

import { resolveTikTokVideoIds } from "@/lib/links/resolveTikTokLinks";
import type { SanityLinksPage } from "@/lib/sanity/types";

import { linksPageFontVariables } from "./fonts";
import type { LinksPageViewProps } from "./LinksPageView";

export async function linksPageExtras(props: LinksPageViewProps, page: SanityLinksPage | null | undefined) {
  return {
    videoIds: await resolveTikTokVideoIds((page?.videos ?? []).map(({ url }) => url)),
    fontVariables: linksPageFontVariables(page?.nameFont, page?.textFont, props.nameStyle),
  };
}
