import { GIFT_SEND_COPY_KEYS } from "@/components/GiftSendForm";
import { applyTokens } from "@/lib/emails/applyTokens";
import { giftContent } from "@/lib/gift/giftContent";
import type { GiftSendStatus } from "@/lib/gift/giftSendContract";
import { pick } from "@/lib/pick";
import type { SanityGiftSettings } from "@/lib/sanity/types";

import type { GiftNoteCopy } from "./GiftNoteBlock";
import type { GiftSendBlockCopy } from "./GiftSendBlock";
import type { GiftThankYouCopy, GiftThankYouViewProps } from "./GiftThankYouView";

const NOTE_COPY_KEYS = [
  "savedNoteLabelTemplate",
  "editNoteLabel",
  "noteFootnote",
  "addNoteLabel",
  "editNoteHeading",
  "fromLabel",
  "noteLabel",
  "buyerNameRequired",
  "noteCounterTemplate",
  "saveNoteLabel",
  "noteSavedNotice",
  "noteLockedNotice",
  "sheetSubmitFailed",
  "sheetNetworkFailed",
  "sheetCancelLabel",
] as const satisfies readonly (keyof GiftNoteCopy)[];

const SEND_COPY_KEYS = [
  ...GIFT_SEND_COPY_KEYS,
  "sendOpenLabel",
] as const satisfies readonly (keyof GiftSendBlockCopy)[];

export type GiftThankYouSource =
  | {
      kind: "active";
      buyerFirstName: string;
      note: string | null;
      displayCode: string;
      giftUrl: string;
      sendToken: string | null;
      sendStatus: GiftSendStatus;
    }
  | { kind: "redeemed"; buyerFirstName: string; displayCode: string; giftUrl: string }
  | { kind: "not_paid"; buyerFirstName: string };

export type DeriveGiftThankYouViewPropsInput = {
  gift: GiftThankYouSource;
  readingName: string;
  giftSettings: SanityGiftSettings | null;
};

export function deriveGiftThankYouViewProps({
  gift,
  readingName,
  giftSettings,
}: DeriveGiftThankYouViewPropsInput): GiftThankYouViewProps {
  const content = giftContent(giftSettings);
  const tokens = { buyerName: gift.buyerFirstName, reading: readingName };
  const isPending = gift.kind === "not_paid";

  const copy: GiftThankYouCopy = {
    heading: applyTokens(
      isPending ? content.pendingHeadingTemplate : content.thankYouHeadingTemplate,
      tokens,
    ),
    subheading: isPending ? content.pendingSubheading : content.thankYouSubheading,
    codeCardLabel: content.codeCardLabel,
    copyLinkLabel: content.copyLinkLabel,
    linkCopiedLabel: content.linkCopiedLabel,
    shareLabel: content.shareLabel,
    codeHelp: applyTokens(content.codeHelpTemplate, tokens),
    thankYouOpenedNotice: content.thankYouOpenedNotice,
    pendingBody: content.pendingBody,
    note: pick(content, NOTE_COPY_KEYS),
    send: pick(content, SEND_COPY_KEYS),
  };

  if (gift.kind === "not_paid") return { state: "pending_payment", copy };

  const shown = {
    copy,
    displayCode: gift.displayCode,
    giftUrl: gift.giftUrl,
    shareText: applyTokens(content.shareMessageTemplate, tokens),
  };
  if (gift.kind === "redeemed") return { state: "redeemed", ...shown };

  return {
    state: "active",
    ...shown,
    note: { buyerFirstName: gift.buyerFirstName, text: gift.note },
    noteEdit: gift.sendToken ? { token: gift.sendToken } : null,
    send: gift.sendToken ? { token: gift.sendToken, status: gift.sendStatus } : null,
  };
}
