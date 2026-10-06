import type { GiftContent } from "@/data/defaults";
import { GIFT_CHECKOUT_MESSAGE_KEYS } from "@/lib/gift/giftCopyKeys";

export const GIFT_SHEET_CONTENT_KEYS = [
  ...GIFT_CHECKOUT_MESSAGE_KEYS,
  "sheetEyebrow",
  "sheetTitleTemplate",
  "sheetStepPay",
  "sheetStepSend",
  "sheetStepRecipient",
  "buyerNameLabel",
  "buyerNameHelp",
  "noteLabel",
  "noteHelpBeforePayment",
  "noteCounterTemplate",
  "sheetCancelLabel",
] as const satisfies readonly (keyof GiftContent)[];

export type GiftSheetContent = Pick<GiftContent, (typeof GIFT_SHEET_CONTENT_KEYS)[number]>;
