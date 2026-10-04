import { groq } from "next-sanity";

import { getSanityWriteClient } from "@/lib/sanity/client";

import { asCustomerEmailType } from "../emailFiredType";
import type { ResendRequest } from "../resendCustomerEmail";

type SanityStudioRequest = {
  _id: string;
  _rev: string;
  deliveryRequestedAt?: string;
  emailResendRequest?: {
    emailType?: string;
    correctedEmail?: string;
    requestedAt?: string;
  };
};

export type PendingResendRequest = ResendRequest & { revision: string };

type StudioRequests = {
  deliveryIds: string[];
  resendRequests: PendingResendRequest[];
};

const STUDIO_REQUESTS_GROQ = groq`
  *[_type == "submission" && !(_id in path("drafts.**"))
    && (defined(deliveryRequestedAt) || defined(emailResendRequest.requestedAt))
  ]{ _id, _rev, deliveryRequestedAt, emailResendRequest }
`;

function toPendingResendRequest(doc: SanityStudioRequest): PendingResendRequest | null {
  const { correctedEmail, requestedAt } = doc.emailResendRequest ?? {};
  const emailType = asCustomerEmailType(doc.emailResendRequest?.emailType);
  if (!emailType || !requestedAt) return null;
  return {
    submissionId: doc._id,
    revision: doc._rev,
    emailType,
    correctedEmail: correctedEmail?.trim() || null,
    requestedAt,
  };
}

export async function fetchStudioRequests(): Promise<StudioRequests> {
  const client = await getSanityWriteClient();
  const docs = await client.fetch<SanityStudioRequest[]>(STUDIO_REQUESTS_GROQ);
  return {
    deliveryIds: docs.filter((doc) => doc.deliveryRequestedAt).map((doc) => doc._id),
    resendRequests: docs.map(toPendingResendRequest).filter((request) => request !== null),
  };
}

export async function claimResendRequest(request: PendingResendRequest): Promise<void> {
  const client = await getSanityWriteClient();
  await client
    .patch(request.submissionId)
    .ifRevisionId(request.revision)
    .unset(["emailResendRequest"])
    .commit();
}

export async function restoreResendRequest(request: PendingResendRequest): Promise<void> {
  const client = await getSanityWriteClient();
  await client
    .patch(request.submissionId)
    .setIfMissing({
      emailResendRequest: {
        emailType: request.emailType,
        correctedEmail: request.correctedEmail ?? undefined,
        requestedAt: request.requestedAt,
      },
    })
    .commit();
}
