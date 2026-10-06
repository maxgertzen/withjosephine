import { type EmailSendResult, sendGiftOpened, type SubmissionContext } from "@/lib/resend";

import { recordUnsentGiftEmail } from "./giftEmailFailures";
import { appendGiftEmailFired } from "./gifts";
import type { GiftRecord } from "./types";

type OpenedGift = Pick<GiftRecord, "id" | "buyerFirstName">;

type OpenedReading = Pick<SubmissionContext, "firstName" | "readingName">;

export function sendBuyerGiftOpened(
  gift: OpenedGift,
  reading: OpenedReading,
  buyerEmail: string,
  idempotencyKey: string,
): Promise<EmailSendResult> {
  return sendGiftOpened(
    {
      to: buyerEmail,
      firstName: gift.buyerFirstName,
      recipientName: reading.firstName,
      readingName: reading.readingName,
    },
    { giftId: gift.id, idempotencyKey },
  );
}

export async function tellBuyerGiftOpened(
  reading: OpenedReading,
  gift: OpenedGift,
  buyerEmail: string,
): Promise<void> {
  const attemptedAt = new Date().toISOString();
  try {
    const result = await sendBuyerGiftOpened(gift, reading, buyerEmail, `gift-opened/${gift.id}`);
    if (result.kind === "dry_run") return;
    if (result.kind !== "sent") {
      await recordUnsentGiftEmail(gift.id, "gift_opened", attemptedAt, result);
      return;
    }
    try {
      await appendGiftEmailFired(gift.id, {
        type: "gift_opened",
        sentAt: new Date().toISOString(),
        resendId: result.resendId,
      });
    } catch (error) {
      console.error(`[gift-opened] emailsFired write failed for gift ${gift.id}`, error);
    }
  } catch (error) {
    console.error(`[gift-opened] gift opened email failed for gift ${gift.id}`, error);
    await recordUnsentGiftEmail(gift.id, "gift_opened", attemptedAt, error);
  }
}
