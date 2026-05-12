/**
 * One-way mirror: D1 is the source of truth (see ADR-001), Sanity holds
 * a read-only projection so Studio can browse submissions. Mirror writes
 * are fire-and-forget — failures are logged but never block the user.
 *
 * If Sanity is missing data, the periodic reconcile cron diffs D1 vs
 * Sanity and pushes the missing rows.
 */

import { getSanityWriteClient } from "@/lib/sanity/client";

import { ART6_CONSENT_LABEL, ART9_CONSENT_LABEL } from "../../compliance/intakeConsent";
import type { EmailFiredEntry, SubmissionRecord } from "../submissions";
import type { CreateSubmissionInput } from "./repository";

type MirrorCreateConsent = {
  consentAcknowledgedAt: string;
  ipAddress: string | null;
  art6AcknowledgedAt: string | null;
  art9AcknowledgedAt: string | null;
};

// `null` ackAt skips the field entirely (Sanity drops null/undefined keys on
// create); a present ackAt produces a `{ labelText, acknowledgedAt }` object
// whose label is locked to the constants the form actually rendered.
function ackBlock(
  label: string,
  ackAt: string | null,
): { labelText: string; acknowledgedAt: string } | undefined {
  return ackAt ? { labelText: label, acknowledgedAt: ackAt } : undefined;
}

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
  consent: MirrorCreateConsent,
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
          // Phase 4 — Art. 6 + Art. 9 labels are sourced from
          // intakeConsent.ts so the UI and the audit record cannot diverge.
          // Legacy labelText/acknowledgedAt remain populated for read-back.
          labelText: input.consentLabel ?? "",
          acknowledgedAt: consent.consentAcknowledgedAt,
          ipAddress: consent.ipAddress ?? undefined,
          art6Consent: ackBlock(ART6_CONSENT_LABEL, consent.art6AcknowledgedAt),
          art9Consent: ackBlock(ART9_CONSENT_LABEL, consent.art9AcknowledgedAt),
        },
        photoR2Key: input.photoR2Key ?? undefined,
        createdAt: input.createdAt,
        ...(input.isGift
          ? {
              isGift: true,
              recipientEmail: input.recipientEmail ?? undefined,
              giftDeliveryMethod: input.giftDeliveryMethod ?? undefined,
              giftSendAt: input.giftSendAt ?? undefined,
              giftMessage: input.giftMessage ?? undefined,
            }
          : {}),
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
    // Phase 5 — gift redemption patch fields.
    responses: SubmissionRecord["responses"];
    giftClaimedAt: string;
    recipientUserId: string;
    art9AcknowledgedAt: string;
    // Phase 5 Session 3 — purchaser-side edits and self-send flips.
    recipientEmail: string;
    giftSendAt: string | null;
    giftDeliveryMethod: "self_send" | "scheduled";
    giftClaimTokenHash: string;
    giftClaimEmailFiredAt: string;
    // Phase 5 Session 4b — LB-4 cascade purchaser pseudonymisation.
    purchaserUserId: string | null;
    email: string;
  }>,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  // Sanity requires `_key` on each array item. Inject keys for responses
  // (the only array-type field in this patch) so writes don't reject.
  const sanitized: Record<string, unknown> = { ...patch };
  if (patch.responses) {
    sanitized.responses = patch.responses.map((response, index) => ({
      _key: `${response.fieldKey}-${index}`,
      _type: "submissionResponse" as const,
      ...response,
    }));
  }
  if (patch.art9AcknowledgedAt) {
    // Mirror the recipient's Art. 9 ack into the existing consentSnapshot
    // shape. The purchaser's Art. 6 was already written at purchase time;
    // we only set art9 here at claim time.
    sanitized["consentSnapshot.art9Consent"] = {
      labelText: ART9_CONSENT_LABEL,
      acknowledgedAt: patch.art9AcknowledgedAt,
    };
    delete sanitized.art9AcknowledgedAt;
  }

  try {
    await client.patch(id).set(sanitized).commit({ visibility: "async" });
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

// Sanity array items must each carry a unique `_key`. Deriving from
// `type|sentAt` keeps the key stable across re-mirrors (reconcile cron
// won't double-insert the same entry under a new key).
function sanityKeyForEmailFired(entry: EmailFiredEntry): string {
  return `${entry.type}-${entry.sentAt}`.replace(/[^A-Za-z0-9_-]/g, "-");
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
      .insert("after", "emailsFired[-1]", [{ ...entry, _key: sanityKeyForEmailFired(entry) }])
      .commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] emailsFired append failed for ${id}`, error);
  }
}

// First-write-wins via setIfMissing — concurrent listens both commit
// but only the earliest write lands.
export async function mirrorMarkSubmissionListened(
  id: string,
  listenedAt: string,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.patch(id).setIfMissing({ listenedAt }).commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] listenedAt write failed for ${id}`, error);
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
