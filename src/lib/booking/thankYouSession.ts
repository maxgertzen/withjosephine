import { retrieveCheckoutSession } from "../stripe";
import { formatAmountPaid } from "./formatAmount";

export type ThankYouPaidAmount = { display: string | null; cents: number | null };

export type ThankYouSessionSnapshot = {
  paidAmount: ThankYouPaidAmount;
  isGift: boolean;
  submissionIdFromSession: string | null;
};

export async function fetchThankYouSessionSnapshot(
  sessionId: string,
): Promise<ThankYouSessionSnapshot> {
  try {
    const session = await retrieveCheckoutSession(sessionId);
    const cents = session.amount_total ?? null;
    return {
      paidAmount: {
        cents,
        display: formatAmountPaid(cents, session.currency ?? undefined),
      },
      isGift: session.metadata?.is_gift === "true",
      submissionIdFromSession: session.client_reference_id ?? null,
    };
  } catch (error) {
    console.warn(`[thank-you] Failed to retrieve session ${sessionId}`, error);
    return {
      paidAmount: { cents: null, display: null },
      isGift: false,
      submissionIdFromSession: null,
    };
  }
}
