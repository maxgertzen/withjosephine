import type { SanityClient } from "sanity";

import type { CustomerEmailType } from "../../src/lib/page-previews/types";

export const STUDIO_API_VERSION = "2025-01-01";

export const REQUESTED_TOAST = "Sending within 5 minutes. You can close this.";

export const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export async function requestDelivery(client: SanityClient, submissionId: string): Promise<void> {
  await client
    .patch(submissionId)
    .set({ deliveryRequestedAt: new Date().toISOString() })
    .unset(["deliveryFailedAt"])
    .commit();
}

export async function requestResend(
  client: SanityClient,
  submissionId: string,
  request: { emailType: CustomerEmailType; sendTo: string },
): Promise<void> {
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
}
