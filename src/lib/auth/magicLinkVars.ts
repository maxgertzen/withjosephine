import { priceDisplayFor } from "@/lib/booking/priceDisplayFor";
import {
  extractFirstName,
  listSubmissionsByRecipientUserId,
  SUBMISSION_STATUS,
} from "@/lib/booking/submissions";

export type MagicLinkUserVars = {
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
};

const FALLBACK: MagicLinkUserVars = {
  firstName: "there",
  readingName: "",
  readingPriceDisplay: "",
};

/**
 * Resolves the {firstName}, {readingName}, {readingPriceDisplay} tokens for
 * magic-link emails by looking up the user's most-recent PAID submission.
 *
 * Falls back to a 'there' / '' shape when the user has no paid submission
 * (typical for the listen-page sign-in flow where the recipient has a user
 * record but not a purchase under their email).
 */
export async function lookupMagicLinkVars(userId: string): Promise<MagicLinkUserVars> {
  const subs = await listSubmissionsByRecipientUserId(userId).catch(() => []);
  const paid = subs.find((s) => s.status === SUBMISSION_STATUS.paid);
  if (!paid) return FALLBACK;
  return {
    firstName: extractFirstName(paid.responses),
    readingName: paid.reading?.name ?? "",
    readingPriceDisplay: priceDisplayFor(paid),
  };
}
