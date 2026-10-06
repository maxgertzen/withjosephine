import "server-only";

import { serverTrack } from "@/lib/analytics/server";

import { giftPaymentEventFields } from "./giftAnalytics";
import { findGiftById, markGiftExpired } from "./gifts";

export async function expireGift(giftId: string, expiredAt: string): Promise<void> {
  const wasExpired = await markGiftExpired(giftId, { expiredAt });
  if (!wasExpired) return;

  const gift = await findGiftById(giftId);
  void serverTrack("payment_expired", {
    ...giftPaymentEventFields(giftId),
    reading_id: gift?.readingSlug ?? "",
  });
}
