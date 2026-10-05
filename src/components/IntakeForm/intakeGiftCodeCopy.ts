import type { GiftContent } from "@/data/defaults";
import { GIFT_CODE_CHECK_MESSAGE_KEYS } from "@/lib/gift/giftCopyKeys";

export const INTAKE_GIFT_CODE_COPY_KEYS = [
  ...GIFT_CODE_CHECK_MESSAGE_KEYS,
  "codeFieldOptionalLabel",
  "codeChecking",
] as const satisfies readonly (keyof GiftContent)[];

export type IntakeGiftCodeCopy = Pick<GiftContent, (typeof INTAKE_GIFT_CODE_COPY_KEYS)[number]>;
