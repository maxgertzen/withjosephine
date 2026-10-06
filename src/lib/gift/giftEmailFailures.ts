import {
  type EmailFailureFields,
  failureFromUnsent,
  reportEmailFailure,
  scrubEmailAddresses,
  withFailureDefaults,
} from "@/lib/booking/emailFailures";

import { appendGiftEmailFailure, releaseGiftSend } from "./gifts";
import {
  GIFT_EMAIL_RECIPIENT,
  GIFT_STATUS,
  type GiftEmailFiredType,
  type GiftEmailRecipient,
  type GiftRecord,
} from "./types";

export type GiftEmailFailureFields = Omit<
  EmailFailureFields<GiftEmailFiredType, GiftEmailRecipient>,
  "recipient"
>;

export async function recordGiftEmailFailure(
  giftId: string,
  fields: GiftEmailFailureFields,
): Promise<void> {
  const failure = withFailureDefaults({
    ...fields,
    recipient: GIFT_EMAIL_RECIPIENT[fields.emailType],
    errorMessage: scrubEmailAddresses(fields.errorMessage),
  });
  reportEmailFailure({ gift_id: giftId }, failure);
  try {
    await appendGiftEmailFailure(giftId, failure);
  } catch (error) {
    console.error(`[email-failure] storing the failure failed for gift ${giftId}`, error);
  }
}

export function recordUnsentGiftEmail(
  giftId: string,
  emailType: GiftEmailFiredType,
  attemptedAt: string,
  resultOrError: unknown,
): Promise<void> {
  return recordGiftEmailFailure(giftId, {
    emailType,
    attemptedAt,
    ...failureFromUnsent(resultOrError),
  });
}

function giftSendNumber(gift: GiftRecord, resendId: string): 1 | 2 | null {
  const sends = gift.emailsFired.filter((entry) => entry.type === "gift_send");
  const position = sends.findIndex((entry) => entry.resendId === resendId) + 1;
  return position === 1 || position === 2 ? position : null;
}

export async function releaseBouncedGiftSend(gift: GiftRecord, resendId: string): Promise<void> {
  const sendNumber = giftSendNumber(gift, resendId);
  if (gift.status !== GIFT_STATUS.active || !sendNumber) return;
  await releaseGiftSend(gift.id, {
    sendNumber,
    keptRecipientName: null,
    updatedAt: new Date().toISOString(),
  });
}
