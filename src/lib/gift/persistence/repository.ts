import { normalizeEmail } from "@/lib/auth/users";
import {
  dbExec,
  dbQuery,
  type SqlStatement,
  type SqlValue,
} from "@/lib/booking/persistence/sqlClient";

import {
  GIFT_SEND_LIMIT,
  type GiftEmailFiredEntry,
  type GiftRecord,
  type GiftStatus,
} from "../types";

const LIST_LIMIT = 500;

type Row = {
  id: string;
  lookup_hash: string;
  reading_slug: string;
  status: GiftStatus;
  buyer_first_name: string;
  buyer_email: string | null;
  note: string | null;
  cooling_off_acknowledged_at: string;
  consent_label: string;
  consent_ip_address: string | null;
  stripe_session_id: string | null;
  created_at: string;
  activated_at: string | null;
  buyer_email_claimed_at: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  send_count: number;
  last_sent_at: string | null;
  redeemed_submission_id: string | null;
  redeemed_at: string | null;
  expired_at: string | null;
  updated_at: string;
  emails_fired_json: string;
};

function rowToRecord(row: Row): GiftRecord {
  return {
    id: row.id,
    lookupHash: row.lookup_hash,
    readingSlug: row.reading_slug,
    status: row.status,
    buyerFirstName: row.buyer_first_name,
    buyerEmail: row.buyer_email,
    note: row.note,
    coolingOffAcknowledgedAt: row.cooling_off_acknowledged_at,
    consentLabel: row.consent_label,
    consentIpAddress: row.consent_ip_address,
    stripeSessionId: row.stripe_session_id,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    buyerEmailClaimedAt: row.buyer_email_claimed_at,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    sendCount: row.send_count,
    lastSentAt: row.last_sent_at,
    redeemedSubmissionId: row.redeemed_submission_id,
    redeemedAt: row.redeemed_at,
    expiredAt: row.expired_at,
    updatedAt: row.updated_at,
    emailsFired: JSON.parse(row.emails_fired_json) as GiftEmailFiredEntry[],
  };
}

async function findOne(sql: string, params: SqlValue[]): Promise<GiftRecord | null> {
  const rows = await dbQuery<Row>(sql, params);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

async function hasRows(sql: string, params: SqlValue[]): Promise<boolean> {
  const rows = await dbQuery<{ id: string }>(sql, params);
  return rows.length > 0;
}

export type InsertGiftRowInput = {
  id: string;
  lookupHash: string;
  readingSlug: string;
  buyerFirstName: string;
  note: string | null;
  coolingOffAcknowledgedAt: string;
  consentLabel: string;
  consentIpAddress: string | null;
  createdAt: string;
};

export async function insertGiftRow(input: InsertGiftRowInput): Promise<void> {
  await dbExec(
    `INSERT INTO gift_codes (
       id, lookup_hash, reading_slug, status, buyer_first_name, note,
       cooling_off_acknowledged_at, consent_label, consent_ip_address, created_at, updated_at
     ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.lookupHash,
      input.readingSlug,
      input.buyerFirstName,
      input.note,
      input.coolingOffAcknowledgedAt,
      input.consentLabel,
      input.consentIpAddress,
      input.createdAt,
      input.createdAt,
    ],
  );
}

export async function findGiftById(giftId: string): Promise<GiftRecord | null> {
  return findOne(`SELECT * FROM gift_codes WHERE id = ? LIMIT 1`, [giftId]);
}

export async function findGiftByLookupHash(lookupHash: string): Promise<GiftRecord | null> {
  return findOne(`SELECT * FROM gift_codes WHERE lookup_hash = ? LIMIT 1`, [lookupHash]);
}

export async function findGiftByStripeSessionId(sessionId: string): Promise<GiftRecord | null> {
  return findOne(`SELECT * FROM gift_codes WHERE stripe_session_id = ? LIMIT 1`, [sessionId]);
}

export async function isGiftActiveForSession(
  giftId: string,
  stripeSessionId: string,
): Promise<boolean> {
  return hasRows(
    `SELECT id FROM gift_codes WHERE id = ? AND status = 'active' AND stripe_session_id = ? LIMIT 1`,
    [giftId, stripeSessionId],
  );
}

export type MarkGiftActiveInput = {
  buyerEmail: string;
  stripeSessionId: string;
  activatedAt: string;
};

export function buildMarkGiftActiveStatement(
  giftId: string,
  paid: MarkGiftActiveInput,
): SqlStatement {
  return {
    sql: `UPDATE gift_codes
          SET status = 'active', activated_at = ?, buyer_email = ?, stripe_session_id = ?, updated_at = ?
          WHERE id = ? AND status IN ('pending', 'expired')`,
    params: [
      paid.activatedAt,
      normalizeEmail(paid.buyerEmail),
      paid.stripeSessionId,
      paid.activatedAt,
      giftId,
    ],
  };
}

export async function claimGiftBuyerEmail(
  giftId: string,
  claimedAt: string,
): Promise<GiftRecord | null> {
  return findOne(
    `UPDATE gift_codes
     SET buyer_email_claimed_at = ?, updated_at = ?
     WHERE id = ? AND status IN ('active', 'redeemed') AND buyer_email_claimed_at IS NULL
     RETURNING *`,
    [claimedAt, claimedAt, giftId],
  );
}

export async function releaseGiftBuyerEmailClaim(giftId: string, claimedAt: string): Promise<void> {
  await dbExec(
    `UPDATE gift_codes
     SET buyer_email_claimed_at = NULL, updated_at = ?
     WHERE id = ? AND buyer_email_claimed_at = ?`,
    [new Date().toISOString(), giftId, claimedAt],
  );
}

export type RedeemGiftInput = {
  giftId: string;
  readingSlug: string;
  submissionId: string;
  redeemedAt: string;
};

export function buildRedeemGiftStatement(args: RedeemGiftInput): SqlStatement {
  return {
    sql: `UPDATE gift_codes
          SET status = 'redeemed', redeemed_submission_id = ?, redeemed_at = ?,
              note = NULL, recipient_email = NULL, updated_at = ?
          WHERE id = ? AND status = 'active' AND reading_slug = ?`,
    params: [args.submissionId, args.redeemedAt, args.redeemedAt, args.giftId, args.readingSlug],
  };
}

export type ClaimGiftSendInput = {
  expectedSendCount: 0 | 1;
  recipientName: string;
  recipientEmail: string;
  updatedAt: string;
};

export async function claimGiftSend(
  giftId: string,
  args: ClaimGiftSendInput,
): Promise<{ sendNumber: 1 | 2 } | null> {
  const rows = await dbQuery<{ send_count: number }>(
    `UPDATE gift_codes
     SET send_count = send_count + 1, recipient_name = ?, recipient_email = ?, updated_at = ?
     WHERE id = ? AND status = 'active' AND send_count = ? AND send_count < ${GIFT_SEND_LIMIT}
     RETURNING send_count`,
    [args.recipientName, args.recipientEmail, args.updatedAt, giftId, args.expectedSendCount],
  );
  return rows[0] ? { sendNumber: rows[0].send_count as 1 | 2 } : null;
}

export type CompleteGiftSendInput = { sendNumber: 1 | 2; sentAt: string };

export function buildCompleteGiftSendStatement(
  giftId: string,
  args: CompleteGiftSendInput,
): SqlStatement {
  return {
    sql: `UPDATE gift_codes
          SET recipient_email = NULL, last_sent_at = ?, updated_at = ?
          WHERE id = ? AND send_count = ?`,
    params: [args.sentAt, args.sentAt, giftId, args.sendNumber],
  };
}

export type ReleaseGiftSendInput = {
  sendNumber: 1 | 2;
  keptRecipientName: string | null;
  updatedAt: string;
};

export async function releaseGiftSend(giftId: string, args: ReleaseGiftSendInput): Promise<void> {
  await dbExec(
    `UPDATE gift_codes
     SET send_count = send_count - 1, recipient_name = ?, recipient_email = NULL, updated_at = ?
     WHERE id = ? AND send_count = ?`,
    [args.keptRecipientName, args.updatedAt, giftId, args.sendNumber],
  );
}

export type UpdateGiftNoteInput = {
  buyerFirstName: string;
  note: string | null;
  updatedAt: string;
};

export async function updateGiftNote(giftId: string, args: UpdateGiftNoteInput): Promise<boolean> {
  return hasRows(
    `UPDATE gift_codes
     SET buyer_first_name = ?, note = ?, updated_at = ?
     WHERE id = ? AND status = 'active'
     RETURNING id`,
    [args.buyerFirstName, args.note, args.updatedAt, giftId],
  );
}

export type MarkGiftExpiredInput = { expiredAt: string };

export async function markGiftExpired(
  giftId: string,
  args: MarkGiftExpiredInput,
): Promise<boolean> {
  return hasRows(
    `UPDATE gift_codes
     SET status = 'expired', expired_at = ?, updated_at = ?
     WHERE id = ? AND status = 'pending'
     RETURNING id`,
    [args.expiredAt, args.expiredAt, giftId],
  );
}

export async function deleteExpiredGift(giftId: string): Promise<boolean> {
  return hasRows(`DELETE FROM gift_codes WHERE id = ? AND status = 'expired' RETURNING id`, [
    giftId,
  ]);
}

export async function listGiftsByStatusOlderThan(
  status: "pending" | "expired",
  cutoffIso: string,
): Promise<GiftRecord[]> {
  const rows = await dbQuery<Row>(
    `SELECT * FROM gift_codes
     WHERE status = ? AND created_at < ?
     ORDER BY created_at ASC
     LIMIT ${LIST_LIMIT}`,
    [status, cutoffIso],
  );
  return rows.map(rowToRecord);
}

export async function listGiftsUpdatedAfter(cutoffIso: string): Promise<GiftRecord[]> {
  const rows = await dbQuery<Row>(
    `SELECT * FROM gift_codes
     WHERE status IN ('active', 'redeemed', 'cancelled') AND updated_at >= ?
     ORDER BY updated_at ASC
     LIMIT ${LIST_LIMIT}`,
    [cutoffIso],
  );
  return rows.map(rowToRecord);
}

export async function clearGiftRecipientsOfUserSubmissions(
  userId: string,
  updatedAt: string,
): Promise<void> {
  await dbExec(
    `UPDATE gift_codes
     SET recipient_name = NULL, recipient_email = NULL, updated_at = ?
     WHERE redeemed_submission_id IN (SELECT id FROM submissions WHERE recipient_user_id = ?)`,
    [updatedAt, userId],
  );
}

export type GiftBoughtRow = {
  id: string;
  status: GiftStatus;
  stripeSessionId: string | null;
  redeemedSubmissionId: string | null;
};

export async function listGiftsBoughtBy(buyerEmail: string): Promise<GiftBoughtRow[]> {
  const rows = await dbQuery<{
    id: string;
    status: GiftStatus;
    stripe_session_id: string | null;
    redeemed_submission_id: string | null;
  }>(
    `SELECT id, status, stripe_session_id, redeemed_submission_id FROM gift_codes WHERE buyer_email = ?`,
    [normalizeEmail(buyerEmail)],
  );
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    stripeSessionId: row.stripe_session_id,
    redeemedSubmissionId: row.redeemed_submission_id,
  }));
}

export async function eraseGiftBuyer(giftId: string, updatedAt: string): Promise<void> {
  await dbExec(
    `UPDATE gift_codes
     SET buyer_email = NULL, note = NULL, buyer_first_name = '', consent_ip_address = NULL, updated_at = ?
     WHERE id = ?`,
    [updatedAt, giftId],
  );
}

export function buildAppendGiftEmailFiredStatement(
  giftId: string,
  entry: GiftEmailFiredEntry,
): SqlStatement {
  return {
    sql: `UPDATE gift_codes
          SET emails_fired_json = json_insert(emails_fired_json, '$[#]', json(?)), updated_at = ?
          WHERE id = ?`,
    params: [JSON.stringify(entry), entry.sentAt, giftId],
  };
}
