import "server-only";

import { normalizeEmail } from "@/lib/auth/users";
import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEVER_CONFIRMED_RETENTION_DAYS = 30;
const UNSENT_SIGNUP_REUSE_WINDOW_MS = DAY_MS;

export type SignupEmail = "download" | "confirm";

export type EmailSignup = {
  id: string;
  email: string;
  source: string;
  consentText: string | null;
  createdAt: string;
  downloadSentAt: string | null;
  confirmSentAt: string | null;
  confirmedAt: string | null;
  providerSyncedAt: string | null;
};

type EmailSignupRow = {
  id: string;
  email: string;
  source: string;
  consent_text: string | null;
  created_at: string;
  download_sent_at: string | null;
  confirm_sent_at: string | null;
  confirmed_at: string | null;
  provider_synced_at: string | null;
};

const SENT_AT_COLUMN: Record<SignupEmail, string> = {
  download: "download_sent_at",
  confirm: "confirm_sent_at",
};

function fromRow(row: EmailSignupRow): EmailSignup {
  return {
    id: row.id,
    email: row.email,
    source: row.source,
    consentText: row.consent_text,
    createdAt: row.created_at,
    downloadSentAt: row.download_sent_at,
    confirmSentAt: row.confirm_sent_at,
    confirmedAt: row.confirmed_at,
    providerSyncedAt: row.provider_synced_at,
  };
}

export function wantsNewsletter(signup: Pick<EmailSignup, "consentText">): boolean {
  return signup.consentText !== null;
}

export async function saveEmailSignup(args: {
  email: string;
  buttonKey: string | null;
  consentText: string | null;
  now?: Date;
}): Promise<EmailSignup> {
  const now = args.now ?? new Date();
  const signup: EmailSignup = {
    id: crypto.randomUUID(),
    email: normalizeEmail(args.email),
    source: args.buttonKey === null ? "footer" : `links:${args.buttonKey}`,
    consentText: args.consentText,
    createdAt: now.toISOString(),
    downloadSentAt: null,
    confirmSentAt: null,
    confirmedAt: null,
    providerSyncedAt: null,
  };
  const unsentEmail = [
    args.buttonKey !== null && "download_sent_at IS NULL",
    args.consentText !== null && "confirm_sent_at IS NULL",
  ].filter(Boolean);
  const sameSignupWithUnsentEmail = `email = ? AND source = ? AND consent_text IS ? AND created_at > ? AND (${unsentEmail.join(" OR ")})`;
  const sameSignup = [
    signup.email,
    signup.source,
    signup.consentText,
    new Date(now.getTime() - UNSENT_SIGNUP_REUSE_WINDOW_MS).toISOString(),
  ];
  const { rowsWritten } = await dbExec(
    `INSERT INTO email_signups (id, email, source, consent_text, created_at)
     SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM email_signups WHERE ${sameSignupWithUnsentEmail})`,
    [signup.id, signup.email, signup.source, signup.consentText, signup.createdAt, ...sameSignup],
  );
  if (rowsWritten === 1) return signup;
  const rows = await dbQuery<EmailSignupRow>(
    `SELECT * FROM email_signups WHERE ${sameSignupWithUnsentEmail} ORDER BY created_at LIMIT 1`,
    sameSignup,
  );
  return rows[0] ? fromRow(rows[0]) : saveEmailSignup(args);
}

export async function findEmailSignup(id: string): Promise<EmailSignup | null> {
  const rows = await dbQuery<EmailSignupRow>("SELECT * FROM email_signups WHERE id = ?", [id]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function findEmailSignupsFor(email: string): Promise<EmailSignup[]> {
  const rows = await dbQuery<EmailSignupRow>(
    "SELECT * FROM email_signups WHERE email = ? ORDER BY created_at",
    [normalizeEmail(email)],
  );
  return rows.map(fromRow);
}

export async function markNewsletterConfirmed(id: string, now = new Date()): Promise<boolean> {
  const { rowsWritten } = await dbExec(
    `UPDATE email_signups SET confirmed_at = ?
      WHERE id = ? AND consent_text IS NOT NULL AND confirmed_at IS NULL`,
    [now.toISOString(), id],
  );
  return rowsWritten > 0;
}

export async function markEmailSent(id: string, sent: SignupEmail, now = new Date()): Promise<void> {
  await dbExec(`UPDATE email_signups SET ${SENT_AT_COLUMN[sent]} = ? WHERE id = ?`, [now.toISOString(), id]);
}

export async function markProviderSynced(id: string, now = new Date()): Promise<void> {
  await dbExec("UPDATE email_signups SET provider_synced_at = ? WHERE id = ?", [now.toISOString(), id]);
}

export async function deleteSignupsNeverConfirmed(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - NEVER_CONFIRMED_RETENTION_DAYS * DAY_MS).toISOString();
  const { rowsWritten } = await dbExec(
    "DELETE FROM email_signups WHERE confirmed_at IS NULL AND created_at < ?",
    [cutoff],
  );
  return rowsWritten;
}

export async function deleteEmailSignupsFor(email: string): Promise<number> {
  const { rowsWritten } = await dbExec("DELETE FROM email_signups WHERE email = ?", [normalizeEmail(email)]);
  return rowsWritten;
}
