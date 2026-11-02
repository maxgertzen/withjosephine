import "server-only";

import { resolveTikTokVideos } from "@/lib/links/tiktokCovers";
import type { SanityLinksPage } from "@/lib/sanity/types";

import { linksPageFontVariables } from "./fonts";
import type { LinksPageViewProps } from "./LinksPageView";

export async function linksPageExtras(props: LinksPageViewProps, page: SanityLinksPage | null | undefined) {
  return {
    videos: await resolveTikTokVideos((page?.videos ?? []).map(({ url }) => url)),
    fontVariables: linksPageFontVariables(page?.nameFont, page?.textFont, props.nameStyle),
  };
}
