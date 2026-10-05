import * as Sentry from "@sentry/cloudflare";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { applyPaidSession, type PaidSessionOutcome } from "@/lib/booking/applyPaidSession";
import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { giftIdFromClientReferenceId } from "@/lib/gift/clientReference";
import { listRecentCompletedCheckoutSessions } from "@/lib/stripe";
import { unixToIso } from "@/lib/stripeSession";

const LOOKBACK_HOURS = 24;
const SECONDS_PER_HOUR = 60 * 60;

type ReconcileSummary = { checked: number; reconciled: number; refunded: number };

function reportSessionFailure(session: Stripe.Checkout.Session, error: unknown): void {
  const clientReferenceId = session.client_reference_id ?? "";
  const giftId = giftIdFromClientReferenceId(clientReferenceId);
  const errorName = error instanceof Error ? error.name : typeof error;
  const { extra, label } = giftId
    ? { extra: { giftId }, label: `gift ${giftId} activation` }
    : { extra: { submissionId: clientReferenceId }, label: `submission ${clientReferenceId} reconcile` };
  Sentry.captureException(error, { extra });
  console.error(`[cron-reconcile] ${label} failed (${errorName}), next run retries`);
}

async function applyReportingFailures(
  session: Stripe.Checkout.Session,
): Promise<PaidSessionOutcome | null> {
  try {
    return await applyPaidSession(session, {
      stripeEventId: `reconcile:${session.id}`,
      paidAt: unixToIso(session.created),
    });
  } catch (error) {
    reportSessionFailure(session, error);
    return null;
  }
}

async function reconcile(): Promise<ReconcileSummary> {
  const sinceUnix = Math.floor(Date.now() / 1000) - LOOKBACK_HOURS * SECONDS_PER_HOUR;
  const sessions = await listRecentCompletedCheckoutSessions(sinceUnix);

  let reconciled = 0;
  let refunded = 0;
  for (const session of sessions) {
    const outcome = await applyReportingFailures(session);
    if (outcome?.kind === "submission_not_found") {
      console.warn(
        `[cron-reconcile] submission ${outcome.submissionId} not found for session ${session.id}`,
      );
    }
    if (outcome?.kind === "booking" && outcome.result === "applied") reconciled += 1;
    if (outcome?.refunded) refunded += 1;
  }

  return { checked: sessions.length, reconciled, refunded };
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
