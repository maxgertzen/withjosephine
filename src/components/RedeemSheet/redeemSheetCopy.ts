import type { GiftContent } from "@/data/defaults";
import { GIFT_CODE_CHECK_MESSAGE_KEYS } from "@/lib/gift/giftCopyKeys";

export const REDEEM_SHEET_CONTENT_KEYS = [
  ...GIFT_CODE_CHECK_MESSAGE_KEYS,
  "sheetEyebrow",
  "redeemHeading",
  "redeemBody",
  "codeFieldLabel",
  "codeChecking",
  "goToReadingTemplate",
  "redeemButtonLabel",
  "sheetCancelLabel",
] as const satisfies readonly (keyof GiftContent)[];

export type RedeemSheetContent = Pick<GiftContent, (typeof REDEEM_SHEET_CONTENT_KEYS)[number]>;
