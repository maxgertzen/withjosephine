import {
  type EmailFailureFields,
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

function latestGiftSendResendId(gift: GiftRecord): string | null {
  const sends = gift.emailsFired.filter((entry) => entry.type === "gift_send");
  return sends.at(-1)?.resendId ?? null;
}

export async function releaseBouncedGiftSend(gift: GiftRecord, resendId: string): Promise<void> {
  if (gift.status !== GIFT_STATUS.active || gift.sendCount < 1) return;
  if (latestGiftSendResendId(gift) !== resendId) return;
  await releaseGiftSend(gift.id, {
    sendNumber: gift.sendCount as 1 | 2,
    keptRecipientName: gift.recipientName,
    updatedAt: new Date().toISOString(),
  });
}
