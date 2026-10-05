import type { SanityClient } from "sanity";

import type { CustomerEmailType } from "../../src/lib/page-previews/types";

export const STUDIO_API_VERSION = "2025-01-01";

export const REQUESTED_TOAST = "Sending now. You can close this.";
export const QUEUED_TOAST = "Saved. It sends within 15 minutes. You can close this.";

export const DELIVERY_WAKE_PATH = "/api/delivery/wake";

export const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export async function requestDelivery(
  client: SanityClient,
  submissionId: string,
  wakeOrigin: string | null,
): Promise<boolean> {
  await client
    .patch(submissionId)
    .set({ deliveryRequestedAt: new Date().toISOString() })
    .unset(["deliveryFailedAt"])
    .commit();
  return wakeDelivery(wakeOrigin, submissionId);
}

export async function requestResend(
  client: SanityClient,
  submissionId: string,
  request: { emailType: CustomerEmailType; sendTo: string },
  wakeOrigin: string | null,
): Promise<boolean> {
  await client
    .patch(submissionId)
    .set({
      emailResendRequest: {
        emailType: request.emailType,
        correctedEmail: request.sendTo.trim(),
        requestedAt: new Date().toISOString(),
      },
    })
    .commit();
  return wakeDelivery(wakeOrigin, submissionId);
}

export const WAKE_ACCEPTED_STATUS = 202;

export function wakeDelivery(wakeOrigin: string | null, submissionId: string): Promise<boolean> {
  if (!wakeOrigin) return Promise.resolve(false);
  const url = `${wakeOrigin}${DELIVERY_WAKE_PATH}?submission=${encodeURIComponent(submissionId)}`;
  return fetch(url, { method: "POST", keepalive: true }).then(
    (response) => response.status === WAKE_ACCEPTED_STATUS,
    () => false,
  );
}
