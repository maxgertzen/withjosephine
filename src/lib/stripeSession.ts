import type Stripe from "stripe";

import type { PaidEventDetails } from "@/lib/booking/notifyPaid";

export type PaidSessionFields = Omit<PaidEventDetails, "stripeEventId">;

export function unixToIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

export function paidFieldsFromSession(
  session: Stripe.Checkout.Session,
  paidAt: string,
): PaidSessionFields {
  return {
    stripeSessionId: session.id,
    paidAt,
    amountPaidCents: session.amount_total ?? null,
    amountPaidCurrency: session.currency ?? null,
    country: session.customer_details?.address?.country ?? null,
  };
}
