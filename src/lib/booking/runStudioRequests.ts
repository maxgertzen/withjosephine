import {
  fetchStudioRequests,
  type StudioRequestScope,
} from "@/lib/booking/persistence/sanityStudioRequests";
import { type DeliverOutcome, isDelivered } from "@/lib/booking/readingDelivery";
import { handleDeliveryRequest, handleResendRequest } from "@/lib/booking/studioRequests";

type DeliverySummary = Record<"sent" | "alreadySent" | "dryRun" | "retryLater" | "failed", number>;

function countDelivery(summary: DeliverySummary, outcome: DeliverOutcome): void {
  summary[isDelivered(outcome) || outcome === "retryLater" ? outcome : "failed"] += 1;
}

export type StudioRequestSummary = DeliverySummary & {
  requested: number;
  resends: Record<string, number>;
};

export function canRunStudioRequests(): boolean {
  return Boolean(process.env.AUTH_TOKEN_SECRET);
}

export async function runStudioRequests(
  scope: StudioRequestScope,
): Promise<StudioRequestSummary | null> {
  if (!canRunStudioRequests()) return null;
  const { deliveryIds, resendRequests } = await fetchStudioRequests(scope);

  const resends: Record<string, number> = {};
  for (const resendRequest of resendRequests) {
    const outcome = await handleResendRequest(resendRequest);
    resends[outcome] = (resends[outcome] ?? 0) + 1;
  }

  const summary: DeliverySummary = { sent: 0, alreadySent: 0, dryRun: 0, retryLater: 0, failed: 0 };
  for (const id of deliveryIds) {
    countDelivery(summary, await handleDeliveryRequest(id));
  }

  return { requested: deliveryIds.length, ...summary, resends };
}
