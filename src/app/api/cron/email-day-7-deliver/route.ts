import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { deliverOne } from "@/lib/booking/deliverDay7";
import { fetchDeliverableSubmissions } from "@/lib/booking/persistence/sanityDelivery";
import { findSubmissionById, listPaidSubmissionsForEmail } from "@/lib/booking/submissions";

async function runCron(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  awaitingAssets: number;
}> {
  const candidates = await listPaidSubmissionsForEmail("day7", {});
  if (candidates.length === 0) {
    return { processed: 0, sent: 0, skipped: 0, awaitingAssets: 0 };
  }

  const deliverable = await fetchDeliverableSubmissions(
    candidates.map((c) => c._id),
    "deliveredAt",
  );
  const deliverableById = new Map(deliverable.map((d) => [d._id, d]));

  let sent = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    const resolved = deliverableById.get(candidate._id);
    if (!resolved) {
      skipped += 1;
      continue;
    }
    try {
      const outcome = await deliverOne(candidate, resolved);
      if (outcome === "sent") sent += 1;
      else skipped += 1;
    } catch (error) {
      console.error(`[cron-email-day-7-deliver] Failed for ${candidate._id}`, error);
      skipped += 1;
    }
  }

  return {
    processed: candidates.length,
    sent,
    skipped,
    awaitingAssets: candidates.length - deliverable.length,
  };
}

async function runForce(submissionId: string): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  awaitingAssets: number;
  submissionId: string;
}> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) {
    return { processed: 0, sent: 0, skipped: 1, awaitingAssets: 0, submissionId };
  }

  const [resolved] = await fetchDeliverableSubmissions([submissionId], "deliveredAt");
  if (!resolved) {
    return { processed: 1, sent: 0, skipped: 1, awaitingAssets: 1, submissionId };
  }

  try {
    const sent = (await deliverOne(submission, resolved)) === "sent" ? 1 : 0;
    return { processed: 1, sent, skipped: 1 - sent, awaitingAssets: 0, submissionId };
  } catch (error) {
    console.error(`[cron-email-day-7-deliver:force] Failed for ${submissionId}`, error);
    return { processed: 1, sent: 0, skipped: 1, awaitingAssets: 0, submissionId };
  }
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
  const url = new URL(request.url);
  const force = url.searchParams.get("force");
  if (force) {
    const summary = await runForce(force);
    return NextResponse.json(summary);
  }
  const summary = await runCron();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
