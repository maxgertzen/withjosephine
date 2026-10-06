import type Stripe from "stripe";

import type { KeptPayment } from "@/lib/stripe";

type KeptCharge = NonNullable<KeptPayment["charge"]>;

export function keptPayment(
  clientReferenceId: string,
  charge: Partial<KeptCharge> = {},
): KeptPayment {
  return {
    clientReferenceId,
    paymentStatus: "paid",
    charge: { status: "succeeded", refunded: false, amount_refunded: 0, disputed: false, ...charge },
  };
}

export function refundAttempt(status: Stripe.Refund["status"] = "succeeded") {
  return {
    kind: "refund",
    refund: { id: "re_test_1", amount: 8900, status } as Stripe.Refund,
  } as const;
}
