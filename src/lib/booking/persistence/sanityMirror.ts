/**
 * One-way mirror: D1 is the source of truth (see ADR-001), Sanity holds
 * a read-only projection so Studio can browse submissions. Mirror writes
 * are fire-and-forget — failures are logged but never block the user.
 *
 * If Sanity is missing data, the periodic reconcile cron diffs D1 vs
 * Sanity and pushes the missing rows.
 */

import type { SanityClient } from "next-sanity";

import { getSanityWriteClient } from "@/lib/sanity/client";

import {
  ART6_CONSENT_LABEL,
  art9ConsentLabel,
  COOLING_OFF_CONSENT_LABEL,
} from "../../compliance/intakeConsent";
import type { EmailFiredEntry, SubmissionRecord } from "../submissions";
import type { CreateSubmissionInput } from "./repository";

type MirrorCreateConsent = {
  consentAcknowledgedAt: string;
  ipAddress: string | null;
  art6AcknowledgedAt: string | null;
  art9AcknowledgedAt: string | null;
  coolingOffAcknowledgedAt: string | null;
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

async function getClient(): Promise<SanityClient | null> {
  try {
    return await getSanityWriteClient();
  } catch (error) {
    console.warn("[sanityMirror] Sanity client not configured — mirror skipped", error);
    return null;
  }
}

/**
 * Look up the reading document by slug. The submission references it
 * via Sanity's reference type. If the lookup fails, fall back to a
 * plain string slug (Studio dashboards still resolve via reading_slug).
 *
 * Reading docs are effectively immutable in practice (3 readings, slugs
 * have never changed). Memoize lookups per slug in module scope to skip
 * the Sanity round-trip on every booking submit.
 *
 * Cloudflare Workers isolate lifetime is non-deterministic. A long-lived
 * isolate serving traffic after a Studio reading-slug rename would return
 * a stale `_ref` until the isolate recycled. The TTL bounds the staleness
 * window. `clearReadingRefCache()` is exported for tests and any future
 * webhook-driven invalidation.
 *
 * The cache stores in-flight Promises (not resolved entries), so concurrent
 * first-time misses for the same slug share a single Sanity round-trip
 * instead of fanning out duplicates. A second known race: a
 * `clearReadingRefCache()` call during an in-flight fetch will see the
 * fetch repopulate the cache after the clear. A webhook invalidator would
 * need an epoch counter checked at set-time to fully close that gap.
 */
const READING_REF_TTL_MS = 5 * 60 * 1000;

type ReadingRef = { _type: "reference"; _ref: string };

type ReadingRefEntry = {
  promise: Promise<ReadingRef | null>;
  expiresAt: number;
};

const readingRefCache = new Map<string, ReadingRefEntry>();

export function clearReadingRefCache(): void {
  readingRefCache.clear();
}

async function fetchReadingRef(
  client: SanityClient,
  slug: string,
): Promise<ReadingRef | null> {
  try {
    const result = await client.fetch<{ _id: string } | null>(
      `*[_type == "reading" && slug.current == $slug][0]{ _id }`,
      { slug },
    );
    if (!result) return null;
    return { _type: "reference" as const, _ref: result._id };
  } catch (error) {
    console.warn(`[sanityMirror] reading ref lookup failed for ${slug}`, error);
    return null;
  }
}

export async function findReadingRef(
  client: SanityClient,
  slug: string,
): Promise<ReadingRef | null> {
  const cached = readingRefCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  if (cached) readingRefCache.delete(slug);
  const promise = fetchReadingRef(client, slug);
  readingRefCache.set(slug, {
    promise,
    expiresAt: Date.now() + READING_REF_TTL_MS,
  });
  // If the fetch resolves null (or rejects internally), drop the cache entry
  // so the next call retries instead of serving null for the full TTL.
  promise
    .then((value) => {
      if (value === null) readingRefCache.delete(slug);
    })
    .catch(() => readingRefCache.delete(slug));
  return promise;
}

export async function mirrorSubmissionCreate(
  input: CreateSubmissionInput,
  consent: MirrorCreateConsent,
): Promise<void> {
  const client = await getClient();
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
          // Art. 6 + Art. 9 labels are sourced from intakeConsent.ts so
          // the UI and the audit record cannot diverge.
          // Legacy labelText/acknowledgedAt remain populated for read-back.
          labelText: input.consentLabel ?? "",
          acknowledgedAt: consent.consentAcknowledgedAt,
          ipAddress: consent.ipAddress ?? undefined,
          art6Consent: ackBlock(ART6_CONSENT_LABEL, consent.art6AcknowledgedAt),
          art9Consent: ackBlock(
            art9ConsentLabel(input.readingSlug),
            consent.art9AcknowledgedAt,
          ),
          coolingOffConsent: ackBlock(
            COOLING_OFF_CONSENT_LABEL,
            consent.coolingOffAcknowledgedAt,
          ),
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

type MirrorPatchBase = Partial<{
  status: SubmissionRecord["status"];
  paidAt: string;
  expiredAt: string;
  stripeEventId: string;
  stripeSessionId: string;
  amountPaidCents: number | null;
  amountPaidCurrency: string | null;
  responses: SubmissionRecord["responses"];
  recipientUserId: string;
  email: string;
}>;

// Art9 label text is derived from readingSlug. A patch that sets art9 without
// also providing readingSlug would write the wrong label for non-soul-blueprint
// readings, so the type requires the pair.
export type MirrorSubmissionPatchInput =
  | (MirrorPatchBase & { art9AcknowledgedAt: string; readingSlug: string })
  | (MirrorPatchBase & { art9AcknowledgedAt?: never; readingSlug?: string });

export async function mirrorSubmissionPatch(
  id: string,
  patch: MirrorSubmissionPatchInput,
): Promise<void> {
  const client = await getClient();
  if (!client) return;

  // Sanity requires `_key` on each array item. Inject keys for responses
  // (the only array-type field in this patch) so writes don't reject.
  const { readingSlug, art9AcknowledgedAt, ...rest } = patch as MirrorPatchBase & {
    readingSlug?: string;
    art9AcknowledgedAt?: string;
  };
  const sanitized: Record<string, unknown> = { ...rest };
  if (rest.responses) {
    sanitized.responses = rest.responses.map((response, index) => ({
      _key: `${response.fieldKey}-${index}`,
      _type: "submissionResponse" as const,
      ...response,
    }));
  }
  if (art9AcknowledgedAt) {
    if (!readingSlug) {
      throw new Error(
        `[sanityMirror] art9AcknowledgedAt provided without readingSlug for ${id}; label text would be wrong`,
      );
    }
    sanitized["consentSnapshot.art9Consent"] = {
      labelText: art9ConsentLabel(readingSlug),
      acknowledgedAt: art9AcknowledgedAt,
    };
  }

  try {
    await client.patch(id).set(sanitized).commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] patch failed for ${id} (drift; reconcile cron will retry)`, error);
  }
}

export async function mirrorSubmissionDelete(id: string): Promise<void> {
  const client = await getClient();
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
  const client = await getClient();
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
  const client = await getClient();
  if (!client) return;
  try {
    await client.patch(id).setIfMissing({ listenedAt }).commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] listenedAt write failed for ${id}`, error);
  }
}

// First-write-wins via setIfMissing — concurrent PDF downloads both commit
// but only the earliest write lands.
export async function mirrorMarkSubmissionPdfDownloaded(
  id: string,
  pdfDownloadedAt: string,
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.patch(id).setIfMissing({ pdfDownloadedAt }).commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] pdfDownloadedAt write failed for ${id}`, error);
  }
}

export async function mirrorUnsetPhotoKey(id: string): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.patch(id).unset(["photoR2Key"]).commit({ visibility: "async" });
  } catch (error) {
    console.error(`[sanityMirror] unset photoR2Key failed for ${id}`, error);
  }
}
