import { processGiftResendRequest } from "../gift/giftEmailResend";
import {
  clearDeliveryRequest,
  markDeliveryRequestFailed,
} from "./persistence/sanityDelivery";
import {
  claimResendRequest,
  type PendingResendRequest,
  restoreResendRequest,
} from "./persistence/sanityStudioRequests";
import { type DeliverOutcome, deliverRequested, isDelivered } from "./readingDelivery";
import { processResendRequest } from "./resendCustomerEmail";
import type { ResendOutcome } from "./resendRequest";

async function logged(label: string, id: string, update: Promise<void>): Promise<boolean> {
  try {
    await update;
    return true;
  } catch (error) {
    console.error(`[studio-requests] ${label} failed for ${id}`, error);
    return false;
  }
}

export async function handleDeliveryRequest(id: string): Promise<DeliverOutcome> {
  const outcome = await deliverRequested(id).catch((error): DeliverOutcome => {
    console.error(`[studio-requests] Delivery failed for ${id}`, error);
    return "skipped";
  });
  if (outcome === "retryLater") return outcome;
  await logged(
    "Delivery request update",
    id,
    isDelivered(outcome)
      ? clearDeliveryRequest(id)
      : markDeliveryRequestFailed(id, new Date().toISOString()),
  );
  return outcome;
}

export async function handleResendRequest(
  request: PendingResendRequest,
): Promise<ResendOutcome | "notClaimed"> {
  if (!(await logged("Resend claim", request.submissionId, claimResendRequest(request)))) {
    return "notClaimed";
  }
  const processing =
    request.kind === "gift" ? processGiftResendRequest(request) : processResendRequest(request);
  const outcome = await processing.catch((error): ResendOutcome => {
    console.error(`[studio-requests] Resend failed for ${request.submissionId}`, error);
    return "retryLater";
  });
  if (outcome === "retryLater") {
    await logged("Resend restore", request.submissionId, restoreResendRequest(request));
  }
  return outcome;
}
