import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { type DeliverOutcome, deliverRequested } from "@/lib/booking/readingDelivery";

async function runForce(submissionId: string) {
  const outcome = await deliverRequested(submissionId).catch((error): DeliverOutcome => {
    console.error(`[cron-deliver-reading] Failed for ${submissionId}`, error);
    return "skipped";
  });
  const sent = outcome === "sent" ? 1 : 0;
  return {
    processed: outcome === "notFound" ? 0 : 1,
    sent,
    skipped: 1 - sent,
    awaitingAssets: outcome === "awaitingAssets" ? 1 : 0,
    submissionId,
    outcome,
  };
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.AUTH_TOKEN_SECRET) {
    return NextResponse.json(
      { error: "AUTH_TOKEN_SECRET missing" },
      { status: 500 },
    );
  }
  const force = new URL(request.url).searchParams.get("force");
  if (!force) {
    return NextResponse.json({ error: "force=<submissionId> required" }, { status: 400 });
  }
  return NextResponse.json(await runForce(force));
}

export const POST = handle;
export const GET = handle;
