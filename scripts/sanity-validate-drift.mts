import { describeValueShape } from "./_lib/sanityValueShape.mts";
import type { SingletonContract } from "./sanity-validate-contract.mts";

export const SANITY_META_FIELDS: ReadonlySet<string> = new Set([
  "_id",
  "_type",
  "_rev",
  "_createdAt",
  "_updatedAt",
  "_key",
  "_system",
]);

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
  const drifts: SchemaDrift[] = [];
  for (const key of Object.keys(doc)) {
    if (SANITY_META_FIELDS.has(key)) continue;
    if (known.has(key)) continue;
    drifts.push({
      singleton: singleton.id,
      unknownField: key,
      valueType: describeValueShape(doc[key]),
    });
  }
  return drifts;
}
