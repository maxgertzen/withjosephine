import type Stripe from "stripe";

import { retrieveCheckoutSession } from "../stripe";
import { formatAmountPaid } from "./formatAmount";

export type ThankYouPaidAmount = { display: string | null; cents: number | null };

export type ThankYouSessionSnapshot =
  | { kind: "ok"; paidAmount: ThankYouPaidAmount; session: Stripe.Checkout.Session }
  | { kind: "unavailable" };

function errorType(error: unknown): string {
  if (error instanceof Error) return (error as Error & { type?: string }).type ?? error.name;
  return typeof error;
}

export async function fetchThankYouSessionSnapshot(
  sessionId: string,
): Promise<ThankYouSessionSnapshot> {
  try {
    const session = await retrieveCheckoutSession(sessionId);
    const cents = session.amount_total ?? null;
    return {
      kind: "ok",
      paidAmount: {
        cents,
        display: formatAmountPaid(cents, session.currency ?? undefined),
      },
      session,
    };
  } catch (error) {
    console.warn(`[thank-you] Failed to retrieve the Stripe session: ${errorType(error)}`);
    return { kind: "unavailable" };
  }
}
