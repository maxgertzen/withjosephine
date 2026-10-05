import { groq } from "next-sanity";

import { asGiftEmailType } from "@/lib/gift/types";
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
    && (!defined($submissionId) || _id == $submissionId)
    && (defined(deliveryRequestedAt) || defined(emailResendRequest.requestedAt))
  ]{ _id, _rev, deliveryRequestedAt, emailResendRequest }
`;

function toPendingResendRequest(doc: SanityStudioRequest): PendingResendRequest | null {
  const { correctedEmail, requestedAt } = doc.emailResendRequest ?? {};
  if (!requestedAt) return null;
  const giftEmailType = asGiftEmailType(doc.emailResendRequest?.emailType);
  if (giftEmailType) {
    return { submissionId: doc._id, revision: doc._rev, emailType: giftEmailType, requestedAt };
  }
  const emailType = asCustomerEmailType(doc.emailResendRequest?.emailType);
  if (!emailType) return null;
  return {
    submissionId: doc._id,
    revision: doc._rev,
    emailType,
    correctedEmail: correctedEmail?.trim() || null,
    requestedAt,
  };
}

export type StudioRequestScope = { submissionId: string } | { requestedBefore: string };

function isInScope(requestedAt: string | undefined, scope: StudioRequestScope): boolean {
  if (!requestedAt) return false;
  return "submissionId" in scope || requestedAt < scope.requestedBefore;
}

export async function fetchStudioRequests(scope: StudioRequestScope): Promise<StudioRequests> {
  const client = await getSanityWriteClient();
  const docs = await client.fetch<SanityStudioRequest[]>(STUDIO_REQUESTS_GROQ, {
    submissionId: "submissionId" in scope ? scope.submissionId : null,
  });
  return {
    deliveryIds: docs
      .filter((doc) => isInScope(doc.deliveryRequestedAt, scope))
      .map((doc) => doc._id),
    resendRequests: docs
      .map(toPendingResendRequest)
      .filter(
        (request): request is PendingResendRequest =>
          request !== null && isInScope(request.requestedAt, scope),
      ),
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
        correctedEmail: ("correctedEmail" in request && request.correctedEmail) || undefined,
        requestedAt: request.requestedAt,
      },
    })
    .commit();
}
