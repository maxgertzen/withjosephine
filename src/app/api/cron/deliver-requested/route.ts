import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { type DeliverOutcome, deliverRequested } from "@/lib/booking/deliverDay7";
import {
  clearDeliveryRequest,
  fetchDeliveryRequestedIds,
  markDeliveryRequestFailed,
} from "@/lib/booking/persistence/sanityDelivery";

async function updateRequest(id: string, update: Promise<void>): Promise<void> {
  await update.catch((error) => {
    console.error(`[cron-deliver-requested] Request update failed for ${id}`, error);
  });
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.AUTH_TOKEN_SECRET) {
    return NextResponse.json({ error: "AUTH_TOKEN_SECRET missing" }, { status: 500 });
  }
  const ids = await fetchDeliveryRequestedIds();
  const summary = {
    requested: ids.length,
    sent: 0,
    alreadySent: 0,
    dryRun: 0,
    retryLater: 0,
    failed: 0,
  };
  for (const id of ids) {
    const outcome = await deliverRequested(id).catch((error): DeliverOutcome => {
      console.error(`[cron-deliver-requested] Failed for ${id}`, error);
      return "skipped";
    });
    if (outcome === "retryLater") {
      summary.retryLater += 1;
    } else if (outcome === "sent" || outcome === "alreadySent" || outcome === "dryRun") {
      summary[outcome] += 1;
      await updateRequest(id, clearDeliveryRequest(id));
    } else {
      summary.failed += 1;
      await updateRequest(id, markDeliveryRequestFailed(id, new Date().toISOString()));
    }
  }
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
