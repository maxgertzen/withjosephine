import type { EmailFiredEntry, EmailFiredType, SubmissionRecord, SubmissionStatus } from "../submissions";
import { dbExec, dbQuery, type SqlValue } from "./sqlClient";

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
  client_reference_id: string | null;
  created_at: string;
  paid_at: string | null;
  expired_at: string | null;
  delivered_at: string | null;
  voice_note_url: string | null;
  pdf_url: string | null;
  emails_fired_json: string;
  abandonment_recovery_fired_at: string | null;
  amount_paid_cents: number | null;
  amount_paid_currency: string | null;
};

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
    clientReferenceId: row.client_reference_id ?? undefined,
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
  clientReferenceId: string | null;
  createdAt: string;
};

export async function createSubmission(input: CreateSubmissionInput): Promise<void> {
  await dbExec(
    `INSERT INTO submissions (
       id, email, status, reading_slug, reading_name, reading_price_display,
       responses_json, consent_label, photo_r2_key, client_reference_id, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.clientReferenceId,
      input.createdAt,
    ],
  );
}

export async function findSubmissionById(id: string): Promise<SubmissionRecord | null> {
  const rows = await dbQuery<Row>(`SELECT * FROM submissions WHERE id = ? LIMIT 1`, [id]);
  const row = rows[0];
  return row ? rowToRecord(row) : null;
}

export async function markSubmissionPaid(
  id: string,
  paid: {
    stripeEventId: string;
    stripeSessionId: string;
    paidAt: string;
    amountPaidCents: number | null;
    amountPaidCurrency: string | null;
  },
): Promise<void> {
  await dbExec(
    `UPDATE submissions
     SET status = 'paid', paid_at = ?, stripe_event_id = ?, stripe_session_id = ?,
         amount_paid_cents = ?, amount_paid_currency = ?
     WHERE id = ?`,
    [
      paid.paidAt,
      paid.stripeEventId,
      paid.stripeSessionId,
      paid.amountPaidCents,
      paid.amountPaidCurrency,
      id,
    ],
  );
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

export async function unsetPhotoR2Key(id: string): Promise<void> {
  await dbExec(`UPDATE submissions SET photo_r2_key = NULL WHERE id = ?`, [id]);
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
  const filters = [`status = 'paid'`, `instr(emails_fired_json, ?) = 0`];
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
