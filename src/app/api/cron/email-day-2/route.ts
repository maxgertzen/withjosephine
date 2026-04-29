import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  appendEmailFired,
  buildSubmissionContext,
  listPaidSubmissionsForEmail,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendDay2Started } from "@/lib/resend";

const HOURS_AFTER_PAID = 48;
const MS_PER_HOUR = 60 * 60 * 1000;

async function processOne(submission: SubmissionRecord): Promise<"sent" | "skipped"> {
  if (submission.status !== "paid") return "skipped";
  const context = buildSubmissionContext(submission);
  const result = await sendDay2Started(context);
  if (!result.resendId) return "skipped";
  await appendEmailFired(submission._id, {
    type: "day2",
    sentAt: new Date().toISOString(),
    resendId: result.resendId,
  });
  return "sent";
}

async function runCron(): Promise<{ processed: number; sent: number; skipped: number }> {
  const cutoff = new Date(Date.now() - HOURS_AFTER_PAID * MS_PER_HOUR).toISOString();
  const candidates = await listPaidSubmissionsForEmail("day2", { paidBefore: cutoff });

  let sent = 0;
  let skipped = 0;
  for (const submission of candidates) {
    try {
      const outcome = await processOne(submission);
      if (outcome === "sent") sent += 1;
      else skipped += 1;
    } catch (error) {
      console.error(`[cron-email-day-2] Failed for ${submission._id}`, error);
      skipped += 1;
    }
  }

  return { processed: candidates.length, sent, skipped };
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runCron();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
