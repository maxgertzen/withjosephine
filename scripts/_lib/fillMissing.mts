import type { Transaction } from "@sanity/client";

export type FillMissingSeed = { _id: string; fields: Record<string, unknown>; parent?: string };

export function fillMissing(transaction: Transaction, seed: FillMissingSeed): Transaction {
  return transaction.patch(seed._id, (patch) =>
    (seed.parent ? patch.setIfMissing({ [seed.parent]: {} }) : patch).setIfMissing(seed.fields),
  );
}
