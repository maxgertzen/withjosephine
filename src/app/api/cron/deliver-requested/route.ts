import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { flagMissingOrderConfirmations } from "@/lib/booking/orderConfirmationSweep";
import { runStudioRequests } from "@/lib/booking/runStudioRequests";

const WAKE_GRACE_MS = 2 * 60 * 1000;

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runStudioRequests({
    requestedBefore: new Date(Date.now() - WAKE_GRACE_MS).toISOString(),
  });
  if (!summary) {
    return NextResponse.json({ error: "AUTH_TOKEN_SECRET missing" }, { status: 500 });
  }
  const missingOrderConfirmations = await flagMissingOrderConfirmations();
  return NextResponse.json({ ...summary, missingOrderConfirmations });
}

export const POST = handle;
export const GET = handle;
