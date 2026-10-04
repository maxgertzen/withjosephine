import "server-only";

import type { ThankYouSessionSnapshot } from "@/lib/booking/thankYouSession";
import { siteOrigin } from "@/lib/env";
import { unixToIso } from "@/lib/stripeSession";

import { activateGift, giftActivationFromSession } from "./activateGift";
import { deriveGiftSendToken, deriveVerifiedGiftCode } from "./giftCode";
import { formatGiftCode, giftPath } from "./giftCodeFormat";
import { findGiftById, findGiftByStripeSessionId } from "./gifts";
import type { GiftRecord } from "./types";

export type GiftThankYouResult =
  | {
      kind: "active";
      giftId: string;
      readingSlug: string;
      buyerFirstName: string;
      note: string | null;
      displayCode: string;
      giftUrl: string;
      sendToken: string;
    }
  | {
      kind: "redeemed";
      giftId: string;
      readingSlug: string;
      buyerFirstName: string;
      displayCode: string;
      giftUrl: string;
    }
  | { kind: "not_paid"; readingSlug: string; buyerFirstName: string };

async function findGiftForSnapshot(
  sessionId: string,
  snapshot: ThankYouSessionSnapshot,
): Promise<GiftRecord | null> {
  if (snapshot.kind === "unavailable") return findGiftByStripeSessionId(sessionId);

  const { session } = snapshot;
  const activation = giftActivationFromSession(session, unixToIso(session.created));
  if (!activation) return null;

  const { gift } = await activateGift(activation);
  const current = gift ?? (await findGiftById(activation.giftId));
  if (!current) throw new Error(`Gift ${activation.giftId} not found for its thank-you page`);
  return current;
}

export async function resolveGiftThankYou(
  sessionId: string,
  snapshot: ThankYouSessionSnapshot,
): Promise<GiftThankYouResult | null> {
  const gift = await findGiftForSnapshot(sessionId, snapshot);
  if (!gift) return null;

  const { id: giftId, readingSlug, buyerFirstName } = gift;
  if (gift.status === "pending" || gift.status === "expired") {
    return { kind: "not_paid", readingSlug, buyerFirstName };
  }
  if (gift.status === "cancelled") throw new Error(`Gift ${giftId} is cancelled`);

  const code = await deriveVerifiedGiftCode(gift);
  if (!code) throw new Error(`Gift ${giftId} has no verifiable code`);

  const shown = {
    giftId,
    readingSlug,
    buyerFirstName,
    displayCode: formatGiftCode(code),
    giftUrl: siteOrigin() + giftPath(code),
  };
  if (gift.status === "redeemed") return { kind: "redeemed", ...shown };
  return {
    kind: "active",
    ...shown,
    note: gift.note,
    sendToken: await deriveGiftSendToken(giftId),
  };
}
