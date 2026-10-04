import * as Sentry from "@sentry/cloudflare";
import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import { findSubmissionById } from "@/lib/booking/submissions";
import { activateGift, giftActivationFromSession } from "@/lib/gift/activateGift";
import { listRecentCompletedCheckoutSessions } from "@/lib/stripe";
import { paidFieldsFromSession, unixToIso } from "@/lib/stripeSession";

const LOOKBACK_HOURS = 24;
const SECONDS_PER_HOUR = 60 * 60;

async function reconcile(): Promise<{ checked: number; reconciled: number }> {
  const sinceUnix = Math.floor(Date.now() / 1000) - LOOKBACK_HOURS * SECONDS_PER_HOUR;
  const sessions = await listRecentCompletedCheckoutSessions(sinceUnix);

  let reconciled = 0;
  for (const session of sessions) {
    const paidAt = unixToIso(session.created);
    const giftActivation = giftActivationFromSession(session, paidAt);
    if (giftActivation) {
      const { giftId } = giftActivation;
      await activateGift(giftActivation).catch((error: unknown) => {
        Sentry.captureException(error, { extra: { giftId } });
        const errorName = error instanceof Error ? error.name : typeof error;
        console.error(
          `[cron-reconcile] gift ${giftId} activation failed (${errorName}), next run retries`,
        );
      });
      continue;
    }

    const submissionId = session.client_reference_id;
    if (!submissionId) continue;

    const submission = await findSubmissionById(submissionId);
    if (!submission) {
      console.warn(`[cron-reconcile] submission ${submissionId} not found for session ${session.id}`);
      continue;
    }

    const result = await applyPaidEvent(submission, {
      stripeEventId: `reconcile:${session.id}`,
      ...paidFieldsFromSession(session, paidAt),
    });

    if (result === "applied") reconciled += 1;
  }

  return { checked: sessions.length, reconciled };
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await reconcile();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
