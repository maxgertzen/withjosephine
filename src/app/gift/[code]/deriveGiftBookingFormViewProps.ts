import type { BookingFormViewProps } from "@/app/book/[readingId]/BookingFormView";
import type { GiftModeNoteProps } from "@/components/GiftMode/GiftModeNote";
import type { IntakeGift } from "@/components/IntakeForm";
import type { GiftContent } from "@/data/defaults";
import { applyTokens } from "@/lib/emails/applyTokens";
import { formatGiftCode } from "@/lib/gift/giftCodeFormat";

export type GiftBookingFormGift = {
  code: string;
  buyerFirstName: string;
  note: string | null;
};

function giftNoteCard(gift: GiftBookingFormGift, copy: GiftContent): GiftModeNoteProps {
  const draftRestoredNotice = copy.draftRestoredNotice;
  if (!gift.buyerFirstName) {
    return {
      label: copy.noteCardLabelNoBuyer,
      note: copy.noteCardNoBuyerBody,
      foot: copy.noteCardFootNoBuyer,
      draftRestoredNotice,
    };
  }
  return {
    label: applyTokens(copy.noteCardLabelTemplate, { buyerName: gift.buyerFirstName }),
    note: gift.note,
    foot: copy.noteCardFoot,
    draftRestoredNotice,
  };
}

function giftPageLine(
  baseTagline: string | undefined,
  gift: GiftBookingFormGift,
  copy: GiftContent,
) {
  const giftSegment = gift.buyerFirstName
    ? applyTokens(copy.pageLineGiftTemplate, { buyerName: gift.buyerFirstName })
    : undefined;
  return [baseTagline, giftSegment].filter(Boolean).join(" · ") || undefined;
}

function giftFinalPage(gift: GiftBookingFormGift, copy: GiftContent): IntakeGift["finalPage"] {
  const buyerName = gift.buyerFirstName;
  return {
    displayCode: formatGiftCode(gift.code),
    codeAppliedTemplate: copy.codeAppliedTemplate,
    removeCodeLabel: copy.removeCodeLabel,
    giftFoot: buyerName ? applyTokens(copy.giftFootTemplate, { buyerName }) : copy.giftFootNoBuyer,
    openedNotice: buyerName ? applyTokens(copy.openedNoticeTemplate, { buyerName }) : null,
  };
}

function giftErrors(copy: GiftContent): IntakeGift["errors"] {
  return {
    ending: {
      gift_already_redeemed: copy.openedRaceError,
      gift_not_found: `${copy.notFoundHeading}. ${copy.notFoundBody}`,
      gift_not_active: `${copy.noLongerActiveHeading}. ${copy.noLongerActiveBody}`,
    },
    tooManyTries: copy.codeTooManyTries,
  };
}

export function deriveGiftBookingFormViewProps(
  base: BookingFormViewProps,
  gift: GiftBookingFormGift,
  copy: GiftContent,
): BookingFormViewProps {
  return {
    ...base,
    readingBlock: {
      ...base.readingBlock,
      otherReadings: { ...base.readingBlock.otherReadings, readings: [] },
    },
    form: {
      ...base.form,
      gift: {
        code: gift.code,
        overrides: {
          submitLabel: copy.sendDetailsLabel,
          loadingStateCopy: copy.sendingDetailsOverlay,
          pageIndicatorTagline: giftPageLine(base.form.pageIndicatorTagline, gift, copy),
        },
        finalPage: giftFinalPage(gift, copy),
        errors: giftErrors(copy),
      },
    },
    gift: {
      noteCard: giftNoteCard(gift, copy),
      priceLine: copy.priceLine,
    },
  };
}
