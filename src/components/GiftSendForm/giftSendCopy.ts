import type { GiftContent } from "@/data/defaults";

export const GIFT_SEND_COPY_KEYS = [
  "sendHeading",
  "recipientNameLabel",
  "recipientEmailLabel",
  "recipientEmailInvalid",
  "recipientEmailIsBuyer",
  "sendHelpTemplate",
  "sendHelpNoNoteTemplate",
  "sendButtonLabel",
  "sendingLabel",
  "sentHeadingTemplate",
  "sentBodyTemplate",
  "resendLinkTemplate",
  "resendUsedHeading",
  "resendUsedBody",
  "alreadySentHeading",
  "alreadySentBodyTemplate",
  "sendPageOpenedHeadingTemplate",
  "sendPageOpenedBody",
  "sendLinkInvalidHeading",
  "sendLinkInvalidBody",
  "sendFailedNotice",
] as const satisfies readonly (keyof GiftContent)[];

export type GiftSendCopy = Pick<GiftContent, (typeof GIFT_SEND_COPY_KEYS)[number]>;
