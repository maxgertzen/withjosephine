import { describeValueShape } from "./_lib/sanityValueShape.mts";
import type { SingletonContract } from "./sanity-validate-contract.mts";

export const SANITY_META_FIELDS: ReadonlySet<string> = new Set([
  "_id",
  "_type",
  "_rev",
  "_createdAt",
  "_updatedAt",
  "_key",
]);

/**
 * Only fields declared `group: "legacy"` in a Studio schema belong here.
 * See `sanity-validate-contract.mts` header for why we don't import from
 * `studio/schemas` directly; this mirror is the cost.
 */
export const LEGACY_FIELDS_BY_SINGLETON: Readonly<Record<string, ReadonlySet<string>>> = {
  emailGiftClaim: new Set([
    "bodyFirstSend",
    "bodyReminder",
    "reminderContactLine",
    "subjectReminder",
    "previewReminder",
    "heroLineReminder",
    "greeting",
  ]),
};

const EMPTY_LEGACY: ReadonlySet<string> = new Set();

export interface SchemaDrift {
  singleton: string;
  unknownField: string;
  valueType: string;
}

export function findSchemaDrift(
  singleton: SingletonContract,
  doc: Record<string, unknown>,
): SchemaDrift[] {
  const known = new Set(singleton.fields.map((f) => f.name));
  const legacy = LEGACY_FIELDS_BY_SINGLETON[singleton.id] ?? EMPTY_LEGACY;
  const drifts: SchemaDrift[] = [];
  for (const key of Object.keys(doc)) {
    if (SANITY_META_FIELDS.has(key)) continue;
    if (known.has(key)) continue;
    if (legacy.has(key)) continue;
    drifts.push({
      singleton: singleton.id,
      unknownField: key,
      valueType: describeValueShape(doc[key]),
    });
  }
  return drifts;
}
