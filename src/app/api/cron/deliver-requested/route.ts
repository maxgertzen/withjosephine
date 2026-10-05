import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { flagMissingOrderConfirmations } from "@/lib/booking/orderConfirmationSweep";
import { fetchStudioRequests } from "@/lib/booking/persistence/sanityStudioRequests";
import { type DeliverOutcome, isDelivered } from "@/lib/booking/readingDelivery";
import { handleDeliveryRequest, handleResendRequest } from "@/lib/booking/studioRequests";

type DeliverySummary = Record<"sent" | "alreadySent" | "dryRun" | "retryLater" | "failed", number>;

function countDelivery(summary: DeliverySummary, outcome: DeliverOutcome): void {
  summary[isDelivered(outcome) || outcome === "retryLater" ? outcome : "failed"] += 1;
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.AUTH_TOKEN_SECRET) {
    return NextResponse.json({ error: "AUTH_TOKEN_SECRET missing" }, { status: 500 });
  }
  const { deliveryIds, resendRequests } = await fetchStudioRequests();

  const resends: Record<string, number> = {};
  for (const resendRequest of resendRequests) {
    const outcome = await handleResendRequest(resendRequest);
    resends[outcome] = (resends[outcome] ?? 0) + 1;
  }

  const summary: DeliverySummary = { sent: 0, alreadySent: 0, dryRun: 0, retryLater: 0, failed: 0 };
  for (const id of deliveryIds) {
    countDelivery(summary, await handleDeliveryRequest(id));
  }

  const missingOrderConfirmations = await flagMissingOrderConfirmations();
  return NextResponse.json({
    requested: deliveryIds.length,
    ...summary,
    resends,
    missingOrderConfirmations,
  });
}

export const POST = handle;
export const GET = handle;
