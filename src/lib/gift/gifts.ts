import { buildFinancialMirrorStatement, type FinancialMirror } from "@/lib/booking/financialMirror";
import { dbBatch, type SqlStatement } from "@/lib/booking/persistence/sqlClient";

import { deriveGiftCode, giftLookupHash } from "./giftCode";
import { normalizeGiftCode } from "./giftCodeFormat";
import type {
  ClaimGiftSendInput,
  CompleteGiftSendInput,
  InsertGiftRowInput,
  MarkGiftActiveInput,
  MarkGiftExpiredInput,
  RedeemGiftInput,
  ReleaseGiftSendInput,
  UpdateGiftNoteInput,
} from "./persistence/repository";
import * as repo from "./persistence/repository";
import type { GiftEmailFiredEntry, GiftRecord, GiftState } from "./types";

export type { CompleteGiftSendInput };

const PLACEHOLDER_LOOKUP_HASH = "0".repeat(64);

export type CreatePendingGiftInput = Omit<InsertGiftRowInput, "id" | "lookupHash">;

export async function createPendingGift(input: CreatePendingGiftInput): Promise<{ giftId: string }> {
  const giftId = crypto.randomUUID();
  const lookupHash = await giftLookupHash(await deriveGiftCode(giftId));
  await repo.insertGiftRow({ ...input, id: giftId, lookupHash });
  return { giftId };
}

export async function findGiftById(giftId: string): Promise<GiftRecord | null> {
  return repo.findGiftById(giftId);
}

export async function findGiftByCode(rawCode: string): Promise<GiftRecord | null> {
  const code = normalizeGiftCode(rawCode);
  const computedHash = await giftLookupHash(code ?? "");
  return repo.findGiftByLookupHash(code ? computedHash : PLACEHOLDER_LOOKUP_HASH);
}

export async function findGiftByStripeSessionId(sessionId: string): Promise<GiftRecord | null> {
  return repo.findGiftByStripeSessionId(sessionId);
}

export function buildMarkGiftActiveStatement(
  giftId: string,
  paid: MarkGiftActiveInput,
): SqlStatement {
  return repo.buildMarkGiftActiveStatement(giftId, paid);
}

export async function markGiftActive(
  giftId: string,
  paid: MarkGiftActiveInput,
  financial?: FinancialMirror,
): Promise<boolean> {
  const statements = [repo.buildMarkGiftActiveStatement(giftId, paid)];
  if (financial) {
    statements.push(buildFinancialMirrorStatement(financial));
  }
  await dbBatch(statements);
  return repo.isGiftActiveForSession(giftId, paid.stripeSessionId);
}

export async function claimGiftBuyerEmail(
  giftId: string,
  claimedAt: string,
): Promise<GiftRecord | null> {
  return repo.claimGiftBuyerEmail(giftId, claimedAt);
}

export async function releaseGiftBuyerEmailClaim(giftId: string, claimedAt: string): Promise<void> {
  await repo.releaseGiftBuyerEmailClaim(giftId, claimedAt);
}

export function buildRedeemGiftStatement(args: RedeemGiftInput): SqlStatement {
  return repo.buildRedeemGiftStatement(args);
}

export async function claimGiftSend(
  giftId: string,
  args: ClaimGiftSendInput,
): Promise<{ sendNumber: 1 | 2 } | null> {
  return repo.claimGiftSend(giftId, args);
}

export async function completeGiftSend(
  giftId: string,
  args: CompleteGiftSendInput,
  emailFired?: GiftEmailFiredEntry,
): Promise<void> {
  const statements = [repo.buildCompleteGiftSendStatement(giftId, args)];
  if (emailFired) {
    statements.push(repo.buildAppendGiftEmailFiredStatement(giftId, emailFired));
  }
  await dbBatch(statements);
}

export async function releaseGiftSend(
  giftId: string,
  args: ReleaseGiftSendInput,
): Promise<void> {
  await repo.releaseGiftSend(giftId, args);
}

export async function updateGiftNote(
  giftId: string,
  args: UpdateGiftNoteInput,
): Promise<boolean> {
  return repo.updateGiftNote(giftId, args);
}

export async function markGiftExpired(
  giftId: string,
  args: MarkGiftExpiredInput,
): Promise<boolean> {
  return repo.markGiftExpired(giftId, args);
}

export async function listGiftsByStatusOlderThan(
  status: "pending" | "expired",
  cutoffIso: string,
): Promise<GiftRecord[]> {
  return repo.listGiftsByStatusOlderThan(status, cutoffIso);
}

export async function listGiftsUpdatedAfter(cutoffIso: string): Promise<GiftRecord[]> {
  return repo.listGiftsUpdatedAfter(cutoffIso);
}

export async function deleteExpiredGift(giftId: string): Promise<boolean> {
  return repo.deleteExpiredGift(giftId);
}

export async function appendGiftEmailFired(
  giftId: string,
  entry: GiftEmailFiredEntry,
): Promise<void> {
  await dbBatch([repo.buildAppendGiftEmailFiredStatement(giftId, entry)]);
}

export function resolveGiftState(gift: GiftRecord | null): GiftState {
  switch (gift?.status) {
    case "active":
      return "active";
    case "redeemed":
      return "redeemed";
    case "cancelled":
      return "not_active";
    default:
      return "not_found";
  }
}
