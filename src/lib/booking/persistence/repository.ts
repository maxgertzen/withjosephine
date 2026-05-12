import type { EmailFiredEntry, EmailFiredType, SubmissionRecord, SubmissionStatus } from "../submissions";
import { dbExec, dbQuery, type SqlStatement, type SqlValue } from "./sqlClient";

const LIST_LIMIT = 500;

type Row = {
  id: string;
  email: string;
  status: string;
  reading_slug: string;
  reading_name: string | null;
  reading_price_display: string | null;
  responses_json: string;
  consent_label: string | null;
  photo_r2_key: string | null;
  stripe_event_id: string | null;
  stripe_session_id: string | null;
  created_at: string;
  paid_at: string | null;
  expired_at: string | null;
  delivered_at: string | null;
  voice_note_url: string | null;
  pdf_url: string | null;
  emails_fired_json: string;
  amount_paid_cents: number | null;
  amount_paid_currency: string | null;
  recipient_user_id: string | null;
  is_gift: number | null;
  purchaser_user_id: string | null;
  recipient_email: string | null;
  gift_delivery_method: string | null;
  gift_send_at: string | null;
  gift_message: string | null;
  gift_claim_token_hash: string | null;
  gift_claim_email_fired_at: string | null;
  gift_claimed_at: string | null;
  gift_cancelled_at: string | null;
};

export type GiftDeliveryMethod = "self_send" | "scheduled";

function parseGiftDeliveryMethod(value: string | null): GiftDeliveryMethod | null {
  return value === "self_send" || value === "scheduled" ? value : null;
}

function rowToRecord(row: Row): SubmissionRecord {
  const responses = JSON.parse(row.responses_json) as SubmissionRecord["responses"];
  const emailsFired = JSON.parse(row.emails_fired_json) as EmailFiredEntry[];
  const reading =
    row.reading_slug || row.reading_name || row.reading_price_display
      ? {
          slug: row.reading_slug ?? "",
          name: row.reading_name ?? "",
          priceDisplay: row.reading_price_display ?? "",
        }
      : null;
  return {
    _id: row.id,
    email: row.email,
    status: row.status as SubmissionStatus,
    responses,
    photoR2Key: row.photo_r2_key ?? undefined,
    stripeEventId: row.stripe_event_id ?? undefined,
    stripeSessionId: row.stripe_session_id ?? undefined,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
    expiredAt: row.expired_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    voiceNoteUrl: row.voice_note_url ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    emailsFired,
    reading,
    amountPaidCents: row.amount_paid_cents,
    amountPaidCurrency: row.amount_paid_currency,
    recipientUserId: row.recipient_user_id ?? null,
    isGift: (row.is_gift ?? 0) === 1,
    purchaserUserId: row.purchaser_user_id ?? null,
    recipientEmail: row.recipient_email ?? null,
    giftDeliveryMethod: parseGiftDeliveryMethod(row.gift_delivery_method),
    giftSendAt: row.gift_send_at ?? null,
    giftMessage: row.gift_message ?? null,
    giftClaimTokenHash: row.gift_claim_token_hash ?? null,
    giftClaimEmailFiredAt: row.gift_claim_email_fired_at ?? null,
    giftClaimedAt: row.gift_claimed_at ?? null,
    giftCancelledAt: row.gift_cancelled_at ?? null,
  };
}

export type CreateSubmissionInput = {
  id: string;
  email: string;
  status: SubmissionStatus;
  readingSlug: string;
  readingName: string | null;
  readingPriceDisplay: string | null;
  responses: SubmissionRecord["responses"];
  consentLabel: string | null;
  photoR2Key: string | null;
  createdAt: string;
  // Phase 5 gift columns. Optional so all existing self-purchase call sites
  // remain unchanged; the gift booking route is the only caller that sets
  // them. recipient_user_id stays NULL for gifts until the recipient claims.
  isGift?: boolean;
  purchaserUserId?: string | null;
  recipientEmail?: string | null;
  giftDeliveryMethod?: GiftDeliveryMethod | null;
  giftSendAt?: string | null;
  giftMessage?: string | null;
};

export async function createSubmission(input: CreateSubmissionInput): Promise<void> {
  await dbExec(
    `INSERT INTO submissions (
       id, email, status, reading_slug, reading_name, reading_price_display,
       responses_json, consent_label, photo_r2_key, created_at,
       is_gift, purchaser_user_id, recipient_email, gift_delivery_method,
       gift_send_at, gift_message
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.email,
      input.status,
      input.readingSlug,
      input.readingName,
      input.readingPriceDisplay,
      JSON.stringify(input.responses),
      input.consentLabel,
      input.photoR2Key,
      input.createdAt,
      input.isGift ? 1 : 0,
      input.purchaserUserId ?? null,
      input.recipientEmail ?? null,
      input.giftDeliveryMethod ?? null,
      input.giftSendAt ?? null,
      input.giftMessage ?? null,
    ],
  );
}

/**
 * Anti-abuse cap (Phase 5 ISC-12a + Session 4b LB-3). Counts gifts addressed to
 * this recipient_email that are still in flight (not yet claimed, not cancelled).
 * The booking-gift route rejects at purchase when the count is ≥ 3; gift-redeem
 * route re-checks at claim time to cover the self_send-mode bypass where
 * recipient_email is NULL at purchase. The current submission is excluded from
 * the count when `excludeSubmissionId` is provided so a gift doesn't gate itself.
 */
export async function countActivePendingGiftsForRecipient(
  recipientEmail: string,
  options?: { excludeSubmissionId?: string },
): Promise<number> {
  const excludeId = options?.excludeSubmissionId;
  const baseSql = `SELECT COUNT(*) AS count FROM submissions
     WHERE is_gift = 1
       AND recipient_email = ?
       AND gift_claimed_at IS NULL
       AND gift_cancelled_at IS NULL`;
  const rows = excludeId
    ? await dbQuery<{ count: number }>(`${baseSql} AND id != ?`, [recipientEmail, excludeId])
    : await dbQuery<{ count: number }>(baseSql, [recipientEmail]);
  return rows[0]?.count ?? 0;
}

/**
 * Phase 5 — self_send mode. Records that the gift's claim URL was generated
 * and emailed to the purchaser at this moment. The same column does double
 * duty for the scheduled-mode cron (Session 2), which writes it at fire time.
 */
export async function markGiftClaimSent(
  submissionId: string,
  tokenHash: string,
  firedAtIso: string,
): Promise<void> {
  await dbExec(
    `UPDATE submissions
        SET gift_claim_token_hash = ?,
            gift_claim_email_fired_at = ?
      WHERE id = ?`,
    [tokenHash, firedAtIso, submissionId],
  );
}

export async function findSubmissionById(id: string): Promise<SubmissionRecord | null> {
  const rows = await dbQuery<Row>(`SELECT * FROM submissions WHERE id = ? LIMIT 1`, [id]);
  const row = rows[0];
  return row ? rowToRecord(row) : null;
}

/**
 * Looks up a gift submission by the SHA-256 hash of its raw claim token.
 * Returns null when there's no match, when the gift was already claimed,
 * or when it was cancelled — all three resolve to the same dead-link UX.
 */
export async function findUnclaimedGiftByTokenHash(
  tokenHash: string,
): Promise<SubmissionRecord | null> {
  const rows = await dbQuery<Row>(
    `SELECT * FROM submissions
       WHERE gift_claim_token_hash = ?
         AND is_gift = 1
         AND gift_claimed_at IS NULL
         AND gift_cancelled_at IS NULL
       LIMIT 1`,
    [tokenHash],
  );
  const row = rows[0];
  return row ? rowToRecord(row) : null;
}

/**
 * Updates the existing gift submission row in place with the recipient's
 * intake responses, marks claimed, and links their user id. Status stays
 * `paid` — payment landed at purchase, not at claim.
 */
export async function redeemGiftSubmission(
  submissionId: string,
  input: {
    responses: SubmissionRecord["responses"];
    recipientUserId: string;
    claimedAtIso: string;
  },
): Promise<void> {
  await dbExec(
    `UPDATE submissions
        SET responses_json = ?,
            recipient_user_id = ?,
            gift_claimed_at = ?
      WHERE id = ?
        AND is_gift = 1
        AND gift_claimed_at IS NULL`,
    [
      JSON.stringify(input.responses),
      input.recipientUserId,
      input.claimedAtIso,
      submissionId,
    ],
  );
}

/**
 * Narrow lookup for the listen-page auth gate + asset routes. Returns
 * just enough columns to authorize the request and proxy the asset —
 * skips the SELECT * + 2× JSON.parse that `findSubmissionById` does.
 * Hot path: every audio Range chunk hits this 5–10× per playback.
 */
export async function findSubmissionListenContext(
  id: string,
): Promise<{
  submissionId: string;
  recipientUserId: string | null;
  voiceNoteUrl: string | null;
  pdfUrl: string | null;
} | null> {
  const rows = await dbQuery<{
    id: string;
    recipient_user_id: string | null;
    voice_note_url: string | null;
    pdf_url: string | null;
  }>(
    `SELECT id, recipient_user_id, voice_note_url, pdf_url
       FROM submissions WHERE id = ? LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    submissionId: row.id,
    recipientUserId: row.recipient_user_id,
    voiceNoteUrl: row.voice_note_url,
    pdfUrl: row.pdf_url,
  };
}

/** Back-compat shim — auth gate only needs the user-id half. */
export async function findSubmissionRecipientUserId(
  id: string,
): Promise<{ submissionId: string; recipientUserId: string | null } | null> {
  const ctx = await findSubmissionListenContext(id);
  if (!ctx) return null;
  return { submissionId: ctx.submissionId, recipientUserId: ctx.recipientUserId };
}

export type MarkSubmissionPaidInput = {
  stripeEventId: string;
  stripeSessionId: string;
  paidAt: string;
  amountPaidCents: number | null;
  amountPaidCurrency: string | null;
  recipientUserId?: string | null;
};

// Fold recipient_user_id into the same UPDATE so callers never observe
// the half-applied state (status=paid + recipient_user_id=NULL). When
// omitted, the COALESCE preserves the existing value so this is safe to
// call from non-payment paths that want to update only the paid columns.
export function buildMarkSubmissionPaidStatement(
  id: string,
  paid: MarkSubmissionPaidInput,
): SqlStatement {
  return {
    sql: `UPDATE submissions
          SET status = 'paid', paid_at = ?, stripe_event_id = ?, stripe_session_id = ?,
              amount_paid_cents = ?, amount_paid_currency = ?,
              recipient_user_id = COALESCE(?, recipient_user_id)
          WHERE id = ?`,
    params: [
      paid.paidAt,
      paid.stripeEventId,
      paid.stripeSessionId,
      paid.amountPaidCents,
      paid.amountPaidCurrency,
      paid.recipientUserId ?? null,
      id,
    ],
  };
}

export async function markSubmissionPaid(
  id: string,
  paid: MarkSubmissionPaidInput,
): Promise<void> {
  const stmt = buildMarkSubmissionPaidStatement(id, paid);
  await dbExec(stmt.sql, stmt.params ?? []);
}

export async function markSubmissionExpired(
  id: string,
  expired: { stripeEventId?: string; expiredAt: string },
): Promise<void> {
  if (expired.stripeEventId) {
    await dbExec(
      `UPDATE submissions
       SET status = 'expired', expired_at = ?, stripe_event_id = ?
       WHERE id = ?`,
      [expired.expiredAt, expired.stripeEventId, id],
    );
    return;
  }
  await dbExec(
    `UPDATE submissions SET status = 'expired', expired_at = ? WHERE id = ?`,
    [expired.expiredAt, id],
  );
}

export async function deleteSubmission(id: string): Promise<void> {
  await dbExec(`DELETE FROM submissions WHERE id = ?`, [id]);
}

/**
 * Phase 5 Session 4b — LB-4 GDPR Art. 17 cascade purchaser walk.
 *
 * Purchaser-owned gift submissions where the recipient is a distinct user
 * who has already claimed: pseudonymise — the recipient holds contract-base
 * Art. 6(1)(b) data that must survive the purchaser's erasure. We NULL the
 * purchaser identifiers (`purchaser_user_id`, top-level `email`) and scrub
 * `purchaser_first_name` from `responses_json`. We keep the gift fields
 * (`gift_claim_token_hash`, `gift_claimed_at`, `recipient_user_id`, etc.)
 * so the recipient's claim/listen path remains intact.
 *
 * Caller passes the existing `responses` so we don't re-issue a SELECT just
 * to derive the scrubbed array.
 */
export async function pseudonymisePurchaserGift(
  id: string,
  existingResponses: SubmissionRecord["responses"],
): Promise<void> {
  const scrubbed = existingResponses.filter(
    (r) => r.fieldKey !== "purchaser_first_name" && r.fieldKey !== "purchaser_email",
  );
  await dbExec(
    `UPDATE submissions
        SET purchaser_user_id = NULL,
            email = '',
            responses_json = ?
      WHERE id = ?`,
    [JSON.stringify(scrubbed), id],
  );
}

export type FinancialRecordInput = {
  submissionId: string;
  userId: string | null;
  email: string;
  paidAt: string;
  amountPaidCents: number;
  amountPaidCurrency: string;
  country: string | null;
  stripeSessionId: string;
  retainedUntil: string;
};

export function buildInsertFinancialRecordStatement(input: FinancialRecordInput): SqlStatement {
  return {
    sql: `INSERT OR IGNORE INTO financial_records (
            submission_id, user_id, email, paid_at, amount_paid_cents,
            amount_paid_currency, country, stripe_session_id, retained_until
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      input.submissionId,
      input.userId,
      input.email,
      input.paidAt,
      input.amountPaidCents,
      input.amountPaidCurrency,
      input.country,
      input.stripeSessionId,
      input.retainedUntil,
    ],
  };
}

export async function insertFinancialRecord(input: FinancialRecordInput): Promise<void> {
  const stmt = buildInsertFinancialRecordStatement(input);
  await dbExec(stmt.sql, stmt.params ?? []);
}

export async function unsetPhotoR2Key(id: string): Promise<void> {
  await dbExec(`UPDATE submissions SET photo_r2_key = NULL WHERE id = ?`, [id]);
}

export async function setSubmissionRecipientUser(
  submissionId: string,
  userId: string,
): Promise<void> {
  await dbExec(
    `UPDATE submissions SET recipient_user_id = ? WHERE id = ?`,
    [userId, submissionId],
  );
}

export async function markSubmissionDelivered(
  id: string,
  delivery: { deliveredAt: string; voiceNoteUrl: string; pdfUrl: string },
): Promise<void> {
  await dbExec(
    `UPDATE submissions
     SET delivered_at = ?, voice_note_url = ?, pdf_url = ?
     WHERE id = ?`,
    [delivery.deliveredAt, delivery.voiceNoteUrl, delivery.pdfUrl, id],
  );
}

export async function listSubmissionsByStatusOlderThan(
  status: SubmissionStatus,
  cutoffIso: string,
): Promise<SubmissionRecord[]> {
  const rows = await dbQuery<Row>(
    `SELECT * FROM submissions
     WHERE status = ? AND created_at < ?
     ORDER BY created_at ASC
     LIMIT ${LIST_LIMIT}`,
    [status, cutoffIso],
  );
  return rows.map(rowToRecord);
}

export async function listSubmissionsCreatedAfter(
  cutoffIso: string,
): Promise<SubmissionRecord[]> {
  const rows = await dbQuery<Row>(
    `SELECT * FROM submissions
     WHERE created_at >= ?
     ORDER BY created_at ASC
     LIMIT ${LIST_LIMIT}`,
    [cutoffIso],
  );
  return rows.map(rowToRecord);
}

export async function listSubmissionsByRecipientUserId(
  userId: string,
): Promise<SubmissionRecord[]> {
  const rows = await dbQuery<Row>(
    `SELECT * FROM submissions
     WHERE recipient_user_id = ? AND status = 'paid' AND delivered_at IS NOT NULL
     ORDER BY created_at DESC
     LIMIT ${LIST_LIMIT}`,
    [userId],
  );
  return rows.map(rowToRecord);
}

/**
 * Phase 5 Session 3 — `/my-gifts` page query. Returns every gift submission
 * the purchaser has ever bought, regardless of status: pre-fire, fired,
 * claimed, delivered, cancelled. Ordering is newest-first so the most
 * recent purchase appears at the top.
 */
export async function listGiftsByPurchaserUserId(
  userId: string,
): Promise<SubmissionRecord[]> {
  const rows = await dbQuery<Row>(
    `SELECT * FROM submissions
     WHERE purchaser_user_id = ? AND is_gift = 1
     ORDER BY created_at DESC
     LIMIT ${LIST_LIMIT}`,
    [userId],
  );
  return rows.map(rowToRecord);
}

export type EditGiftRecipientPatch = {
  recipientEmail?: string;
  recipientName?: string;
  giftSendAt?: string | null;
};

/**
 * Pre-fire edit. UPDATE guards with `gift_claim_email_fired_at IS NULL`
 * so a concurrent alarm fire can't be retroactively un-fired. Returns
 * `false` when the row was either not found, already fired, claimed,
 * or cancelled — callers translate that into a 409.
 *
 * recipient_name lives in `responses_json` (Phase 5 1b lock); the
 * surrounding submissions wrapper handles that update via the Sanity
 * mirror, not this raw repo helper. Repo-level edits keep to the
 * top-level columns.
 */
export async function editGiftRecipient(
  id: string,
  patch: EditGiftRecipientPatch,
  existingResponses: SubmissionRecord["responses"],
): Promise<{ updated: boolean; responses: SubmissionRecord["responses"] }> {
  const sets: string[] = [];
  const params: SqlValue[] = [];
  if (patch.recipientEmail !== undefined) {
    sets.push("recipient_email = ?");
    params.push(patch.recipientEmail);
  }
  if (patch.giftSendAt !== undefined) {
    sets.push("gift_send_at = ?");
    params.push(patch.giftSendAt);
  }
  let responses = existingResponses;
  if (patch.recipientName !== undefined) {
    responses = upsertResponseField(existingResponses, {
      fieldKey: "recipient_name",
      fieldLabelSnapshot: "Recipient name",
      fieldType: "text",
      value: patch.recipientName,
    });
    sets.push("responses_json = ?");
    params.push(JSON.stringify(responses));
  }
  if (sets.length === 0) return { updated: true, responses };
  params.push(id);
  const result = await dbExec(
    `UPDATE submissions
        SET ${sets.join(", ")}
      WHERE id = ?
        AND is_gift = 1
        AND gift_claim_email_fired_at IS NULL
        AND gift_claimed_at IS NULL
        AND gift_cancelled_at IS NULL`,
    params,
  );
  return { updated: result.rowsWritten > 0, responses };
}

function upsertResponseField(
  existing: SubmissionRecord["responses"],
  entry: SubmissionRecord["responses"][number],
): SubmissionRecord["responses"] {
  const index = existing.findIndex((r) => r.fieldKey === entry.fieldKey);
  if (index === -1) return [...existing, entry];
  const next = existing.slice();
  next[index] = { ...next[index], ...entry };
  return next;
}

/**
 * Phase 5 Session 3 — purchaser flips scheduled→self_send.
 * Writes are pre-fire so the WHERE-guard mirrors `editGiftRecipient`.
 */
export async function flipGiftToSelfSend(
  id: string,
  args: { tokenHash: string; firedAtIso: string },
): Promise<boolean> {
  const result = await dbExec(
    `UPDATE submissions
        SET gift_delivery_method = 'self_send',
            gift_send_at = NULL,
            gift_claim_token_hash = ?,
            gift_claim_email_fired_at = ?
      WHERE id = ?
        AND is_gift = 1
        AND gift_delivery_method = 'scheduled'
        AND gift_claim_email_fired_at IS NULL
        AND gift_claimed_at IS NULL
        AND gift_cancelled_at IS NULL`,
    [args.tokenHash, args.firedAtIso, id],
  );
  return result.rowsWritten > 0;
}

export async function listAllReferencedPhotoKeys(): Promise<Set<string>> {
  const rows = await dbQuery<{ photo_r2_key: string }>(
    `SELECT photo_r2_key FROM submissions WHERE photo_r2_key IS NOT NULL`,
  );
  return new Set(rows.map((row) => row.photo_r2_key));
}

export async function listPaidSubmissionsForEmail(
  emailType: EmailFiredType,
  options: { paidBefore?: string },
): Promise<SubmissionRecord[]> {
  // Gift rows are `paid` from the moment Stripe fires, but they're NOT
  // eligible for Day-2 / Day-7 emails until the recipient has claimed
  // (responses[] populated, gift_claimed_at set). Self-purchase rows
  // always pass via the `is_gift = 0` arm.
  const filters = [
    `status = 'paid'`,
    `instr(emails_fired_json, ?) = 0`,
    `(is_gift = 0 OR gift_claimed_at IS NOT NULL)`,
  ];
  const params: SqlValue[] = [`"type":"${emailType}"`];
  if (options.paidBefore) {
    filters.push(`paid_at < ?`);
    params.push(options.paidBefore);
  }

  const rows = await dbQuery<Row>(
    `SELECT * FROM submissions
     WHERE ${filters.join(" AND ")}
     ORDER BY paid_at ASC
     LIMIT ${LIST_LIMIT}`,
    params,
  );
  return rows.map(rowToRecord);
}

export async function appendEmailFired(id: string, entry: EmailFiredEntry): Promise<void> {
  await dbExec(
    `UPDATE submissions
     SET emails_fired_json = json_insert(emails_fired_json, '$[#]', json(?))
     WHERE id = ?`,
    [JSON.stringify(entry), id],
  );
}
