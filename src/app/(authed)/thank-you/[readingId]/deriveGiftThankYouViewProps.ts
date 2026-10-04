import { applyTokens } from "@/lib/emails/applyTokens";
import { giftContent } from "@/lib/gift/giftContent";
import type { SanityGiftSettings } from "@/lib/sanity/types";

import type { GiftNoteCopy } from "./GiftNoteBlock";
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

function pick<T, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;
}

export type GiftThankYouSource =
  | {
      kind: "active";
      buyerFirstName: string;
      note: string | null;
      displayCode: string;
      giftUrl: string;
      sendToken: string | null;
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
  };
}
