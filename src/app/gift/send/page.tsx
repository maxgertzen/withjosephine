import type { Metadata } from "next";

import { loadGiftContent } from "@/app/gift/[code]/loadGiftPageProps";
import { pick } from "@/lib/pick";
import { SITE_NAME } from "@/lib/seoMetadata";

import { GiftSendLinkPage } from "./GiftSendLinkPage";
import { GIFT_SEND_PAGE_COPY_KEYS } from "./GiftSendPageView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: SITE_NAME,
  robots: { index: false, follow: false },
};

export default async function GiftSendPage() {
  const content = await loadGiftContent("published");
  return <GiftSendLinkPage copy={pick(content, GIFT_SEND_PAGE_COPY_KEYS)} />;
}
