import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { isFlagEnabled } from "@/lib/env";
import { deriveVerifiedGiftCode } from "@/lib/gift/giftCode";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";
import { findGiftByCode, resolveGiftState } from "@/lib/gift/gifts";
import { readingExists } from "@/lib/readingSummary";
import { fetchReadingPublished } from "@/lib/sanity/fetch";

export type GiftPageMessage = "already_opened" | "no_longer_active" | "not_found" | "rate_limited";

export type GiftPageState =
  | {
      kind: "form";
      gift: {
        id: string;
        code: string;
        buyerFirstName: string;
        note: string | null;
        readingSlug: string;
      };
    }
  | { kind: "message"; message: GiftPageMessage; readingSlug: string | null };

function giftMessage(message: GiftPageMessage, readingSlug: string | null = null): GiftPageState {
  return { kind: "message", message, readingSlug };
}

export const resolveGiftRequest = cache(async (code: string): Promise<GiftPageState> => {
  if (!isFlagEnabled("GIFTS_ENABLED")) notFound();
  if (!(await checkGiftRateLimit(await headers()))) return giftMessage("rate_limited");

  const gift = await findGiftByCode(code);
  const state = resolveGiftState(gift);
  if (!gift || state === "not_found") return giftMessage("not_found");
  if (state === "redeemed") return giftMessage("already_opened", gift.readingSlug);
  if (state === "not_active") return giftMessage("no_longer_active", gift.readingSlug);
  if (!(await readingExists(gift.readingSlug, fetchReadingPublished))) {
    return giftMessage("no_longer_active");
  }

  const verifiedCode = await deriveVerifiedGiftCode(gift);
  if (!verifiedCode) return giftMessage("not_found");

  return {
    kind: "form",
    gift: {
      id: gift.id,
      code: verifiedCode,
      buyerFirstName: gift.buyerFirstName,
      note: gift.note,
      readingSlug: gift.readingSlug,
    },
  };
});
