import { computeFinancialRetainedUntil } from "@/lib/compliance/retention";
import type { PaidSessionFields } from "@/lib/stripeSession";

import {
  buildInsertFinancialRecordStatement,
  type FinancialRecordInput,
} from "./persistence/repository";
import type { SqlStatement } from "./persistence/sqlClient";

export type FinancialMirror = Omit<FinancialRecordInput, "retainedUntil">;

type FinancialMirrorPayer = Pick<FinancialMirror, "submissionId" | "userId" | "email">;

export function buildFinancialMirror(
  payer: FinancialMirrorPayer,
  paid: PaidSessionFields,
): FinancialMirror | undefined {
  const { amountPaidCents, amountPaidCurrency } = paid;
  if (amountPaidCents == null || amountPaidCurrency == null) return undefined;
  return {
    ...payer,
    paidAt: paid.paidAt,
    amountPaidCents,
    amountPaidCurrency,
    country: paid.country,
    stripeSessionId: paid.stripeSessionId,
  };
}

export function buildFinancialMirrorStatement(financial: FinancialMirror): SqlStatement {
  return buildInsertFinancialRecordStatement({
    ...financial,
    retainedUntil: computeFinancialRetainedUntil(financial.paidAt),
  });
}
