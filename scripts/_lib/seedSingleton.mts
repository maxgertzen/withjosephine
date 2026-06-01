import type { SanityClient } from "@sanity/client";

import { sanityWriteClient } from "./sanity-write-client.mts";

type SanityPatch = ReturnType<SanityClient["patch"]>;

function assertWriteEnv(logPrefix: string): { client: SanityClient; dataset: string } {
  const client = sanityWriteClient();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[${logPrefix}] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  return { client, dataset };
}

export async function seedSingletonFields(args: {
  docType: string;
  fields: Record<string, unknown>;
  logPrefix: string;
}): Promise<void> {
  const { client } = assertWriteEnv(args.logPrefix);
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "${args.docType}"][0]{_id}`,
  );
  if (!doc) {
    console.warn(`[skip] no ${args.docType} singleton in this dataset.`);
    return;
  }
  await client.patch(doc._id).setIfMissing(args.fields).commit();
  console.log(
    `setIfMissing applied to ${doc._id} for: ${Object.keys(args.fields).join(", ")}.`,
  );
}

/**
 * Fetches the singleton with a caller-supplied projection, then hands the
 * patch builder + projected doc to `mutate`. Caller decides what to set,
 * unset, or skip. Returns the projected doc so callers can log specifics.
 */
export async function patchSingleton<TDoc extends { _id: string }>(args: {
  docType: string;
  projection: string;
  mutate: (patch: SanityPatch, doc: TDoc) => SanityPatch | null;
  logPrefix: string;
}): Promise<TDoc | null> {
  const { client } = assertWriteEnv(args.logPrefix);
  const doc = await client.fetch<TDoc | null>(
    `*[_type == "${args.docType}"][0]${args.projection}`,
  );
  if (!doc) {
    console.warn(`[${args.logPrefix}] no ${args.docType} singleton in this dataset.`);
    return null;
  }
  const patch = args.mutate(client.patch(doc._id), doc);
  if (patch === null) {
    console.log(`[${args.logPrefix}] no mutation needed for ${doc._id}.`);
    return doc;
  }
  await patch.commit();
  return doc;
}

/**
 * Conditionally patches a single field of a singleton: writes `newValue`
 * only when the current value equals `oldValue` exactly. Preserves any
 * Becky-edited value that has diverged from the default. Idempotent.
 */
export async function setIfMatchesDefault<TValue>(args: {
  docType: string;
  fieldName: string;
  oldValue: TValue;
  newValue: TValue;
  logPrefix: string;
}): Promise<boolean> {
  type Doc = { _id: string } & Record<string, TValue | undefined>;
  let changed = false;
  await patchSingleton<Doc>({
    docType: args.docType,
    projection: `{_id, "${args.fieldName}": ${args.fieldName}}`,
    logPrefix: args.logPrefix,
    mutate: (patch, doc) => {
      if (doc[args.fieldName] !== args.oldValue) {
        console.log(
          `[${args.logPrefix}] ${args.fieldName} on ${doc._id} does not match expected default; preserving current value.`,
        );
        return null;
      }
      changed = true;
      return patch.set({ [args.fieldName]: args.newValue });
    },
  });
  return changed;
}
