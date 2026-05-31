import { priceDisplayFor } from "@/lib/booking/priceDisplayFor";
import {
  extractFirstName,
  findMostRecentPaidByRecipientUserId,
  FIRST_NAME_FALLBACK,
} from "@/lib/booking/submissions";

export type MagicLinkUserVars = {
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
};

export const MAGIC_LINK_VARS_FALLBACK: MagicLinkUserVars = {
  firstName: FIRST_NAME_FALLBACK,
  readingName: "",
  readingPriceDisplay: "",
};

/**
 * Resolves {firstName}, {readingName}, {readingPriceDisplay} for magic-link
 * emails. Falls back to MAGIC_LINK_VARS_FALLBACK whenever the user has no
 * paid submission OR the lookup itself fails; keeps the email send path
 * fire-and-forget safe so a DB blip never blocks sign-in.
 */
export async function lookupMagicLinkVars(userId: string): Promise<MagicLinkUserVars> {
  const paid = await findMostRecentPaidByRecipientUserId(userId).catch(() => null);
  if (!paid) return MAGIC_LINK_VARS_FALLBACK;
  return {
    firstName: extractFirstName(paid.responses),
    readingName: paid.reading?.name ?? "",
    readingPriceDisplay: priceDisplayFor(paid),
  };
}
