import type { GiftContent } from "@/data/defaults";

export const GIFT_FOLD_COPY_KEYS = [
  "giftRowLabel",
  "buyLead",
  "buyLinkLabel",
  "redeemLead",
  "redeemLinkLabel",
] as const satisfies readonly (keyof GiftContent)[];

export type GiftFoldCopy = Pick<GiftContent, (typeof GIFT_FOLD_COPY_KEYS)[number]>;
