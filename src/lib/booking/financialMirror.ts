import { computeFinancialRetainedUntil } from "@/lib/compliance/retention";

import {
  buildInsertFinancialRecordStatement,
  type FinancialRecordInput,
} from "./persistence/repository";
import type { SqlStatement } from "./persistence/sqlClient";

export type FinancialMirror = Omit<FinancialRecordInput, "retainedUntil">;

export function buildFinancialMirrorStatement(financial: FinancialMirror): SqlStatement {
  return buildInsertFinancialRecordStatement({
    ...financial,
    retainedUntil: computeFinancialRetainedUntil(financial.paidAt),
  });
}
