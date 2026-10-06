import type { GiftContent } from "@/data/defaults";

export const GIFT_CHECKOUT_MESSAGE_KEYS = [
  "buyerNameRequired",
  "sheetSubmitFailed",
  "sheetNetworkFailed",
] as const satisfies readonly (keyof GiftContent)[];

export const GIFT_CODE_CHECK_MESSAGE_KEYS = [
  "redeemSheetEmpty",
  "codeNotFound",
  "codeOtherReadingTemplate",
  "codeTooManyTries",
  "sheetSubmitFailed",
  "sheetNetworkFailed",
] as const satisfies readonly (keyof GiftContent)[];

export type GiftCheckoutMessages = Pick<GiftContent, (typeof GIFT_CHECKOUT_MESSAGE_KEYS)[number]>;
export type GiftCodeCheckMessages = Pick<
  GiftContent,
  (typeof GIFT_CODE_CHECK_MESSAGE_KEYS)[number]
>;
