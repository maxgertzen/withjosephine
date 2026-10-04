"use client";

import { type GiftSendPageCopy, GiftSendPageView } from "./GiftSendPageView";
import { useGiftSendLink } from "./useGiftSendLink";

export function GiftSendLinkPage({ copy }: { copy: GiftSendPageCopy }) {
  return <GiftSendPageView copy={copy} {...useGiftSendLink()} />;
}
