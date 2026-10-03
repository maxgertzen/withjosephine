import { groq } from "next-sanity";

import { getSanityWriteClient } from "@/lib/sanity/client";

import {
  type DeliverableSubmission,
  isDeliverable,
  type SanitySubmissionDeliveryShape,
} from "./isDeliverable";

export type { DeliverableSubmission } from "./isDeliverable";

export type DeliveryTrigger = "deliveredAt" | "deliveryRequestedAt";

const deliverableGroq = (trigger: DeliveryTrigger) => groq`
  *[_type == "submission" && _id in $ids
    && defined(${trigger})
    && defined(voiceNote.asset)
    && defined(readingPdf.asset)
  ]{
    _id,
    "voiceNoteUrl": voiceNote.asset->url,
    "pdfUrl": readingPdf.asset->url
  }
`;

const UNDELIVERED_GROQ = groq`
  *[_type == "submission" && _id in $ids && !defined(deliveredAt)]._id
`;

export async function fetchDeliverableSubmissions(
  ids: readonly string[],
  trigger: DeliveryTrigger,
): Promise<DeliverableSubmission[]> {
  if (ids.length === 0) return [];
  const client = await getSanityWriteClient();
  const docs = await client.fetch<SanitySubmissionDeliveryShape[]>(deliverableGroq(trigger), {
    ids,
  });
  return docs.filter(isDeliverable);
}

export async function fetchUndeliveredSubmissionIds(
  ids: readonly string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const client = await getSanityWriteClient();
  const result = await client.fetch<string[]>(UNDELIVERED_GROQ, { ids });
  return new Set(result);
}

const DELIVERY_REQUESTED_GROQ = groq`
  *[_type == "submission" && defined(deliveryRequestedAt) && !(_id in path("drafts.**"))]._id
`;

export async function fetchDeliveryRequestedIds(): Promise<string[]> {
  const client = await getSanityWriteClient();
  return client.fetch<string[]>(DELIVERY_REQUESTED_GROQ);
}

export async function clearDeliveryRequest(id: string): Promise<void> {
  const client = await getSanityWriteClient();
  await client.patch(id).unset(["deliveryRequestedAt"]).commit();
}

export async function markDeliveryRequestFailed(id: string, failedAt: string): Promise<void> {
  const client = await getSanityWriteClient();
  await client
    .patch(id)
    .set({ deliveryFailedAt: failedAt })
    .unset(["deliveryRequestedAt"])
    .commit();
}
