/**
 * One-way mirror: D1 is the source of truth (see ADR-001), Sanity holds
 * a read-only projection so Studio can browse submissions. Mirror writes
 * are fire-and-forget — failures are logged but never block the user.
 *
 * If Sanity is missing data, the periodic reconcile cron diffs D1 vs
 * Sanity and pushes the missing rows.
 */

import { getSanityWriteClient } from "@/lib/sanity/client";

import type { EmailFiredEntry, SubmissionRecord } from "../submissions";
import type { CreateSubmissionInput } from "./repository";

type SanityWritable = ReturnType<typeof getSanityWriteClient>;

function getClient(): SanityWritable | null {
  try {
    return getSanityWriteClient();
  } catch (error) {
    console.warn("[sanityMirror] Sanity client not configured — mirror skipped", error);
    return null;
  }
}

/**
 * Look up the reading document by slug. The submission references it
 * via Sanity's reference type. If the lookup fails, fall back to a
 * plain string slug (Studio dashboards still resolve via reading_slug).
 */
async function findReadingRef(
  client: SanityWritable,
  slug: string,
): Promise<{ _type: "reference"; _ref: string } | null> {
  try {
    const result = await client.fetch<{ _id: string } | null>(
      `*[_type == "reading" && slug.current == $slug][0]{ _id }`,
      { slug },
    );
    return result ? { _type: "reference", _ref: result._id } : null;
  } catch (error) {
    console.warn(`[sanityMirror] reading ref lookup failed for ${slug}`, error);
    return null;
  }
}

export async function mirrorSubmissionCreate(
  input: CreateSubmissionInput,
  consentAcknowledgedAt: string,
  ip: string | null,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const readingRef = await findReadingRef(client, input.readingSlug);
    const responsesWithKeys = input.responses.map((response, index) => ({
      _key: `${response.fieldKey}-${index}`,
      _type: "submissionResponse" as const,
      ...response,
    }));
    await client.create(
      {
        _id: input.id,
        _type: "submission",
        status: input.status,
        ...(readingRef ? { serviceRef: readingRef } : {}),
        email: input.email,
        responses: responsesWithKeys,
        consentSnapshot: {
          labelText: input.consentLabel ?? "",
          acknowledgedAt: consentAcknowledgedAt,
          ipAddress: ip ?? undefined,
        },
        photoR2Key: input.photoR2Key ?? undefined,
        createdAt: input.createdAt,
      },
      { visibility: "async" },
    );
  } catch (error) {
    console.error(`[sanityMirror] create failed for ${input.id} (drift; reconcile cron will retry)`, error);
  }
}

export async function mirrorSubmissionPatch(
  id: string,
  patch: Partial<{
    status: SubmissionRecord["status"];
    paidAt: string;
    expiredAt: string;
    stripeEventId: string;
    stripeSessionId: string;
    amountPaidCents: number | null;
    amountPaidCurrency: string | null;
  }>,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.patch(id).set(patch).commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] patch failed for ${id} (drift; reconcile cron will retry)`, error);
  }
}

export async function mirrorSubmissionDelete(id: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.delete(id);
  } catch (error) {
    console.error(`[sanityMirror] delete failed for ${id}`, error);
  }
}

export async function mirrorAppendEmailFired(
  id: string,
  entry: EmailFiredEntry,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client
      .patch(id)
      .setIfMissing({ emailsFired: [] })
      .insert("after", "emailsFired[-1]", [entry])
      .commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] emailsFired append failed for ${id}`, error);
  }
}

export async function mirrorUnsetPhotoKey(id: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.patch(id).unset(["photoR2Key"]).commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] unset photoR2Key failed for ${id}`, error);
  }
}
