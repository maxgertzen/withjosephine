import "server-only";

import { normalizeEmail } from "@/lib/auth/users";
import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEVER_CONFIRMED_RETENTION_DAYS = 30;
const UNSENT_SIGNUP_REUSE_WINDOW_MS = DAY_MS;

export type EmailSignup = {
  id: string;
  email: string;
  source: string;
  consentText: string | null;
  createdAt: string;
  emailsSentAt: string | null;
  confirmedAt: string | null;
  providerSyncedAt: string | null;
};

type EmailSignupRow = {
  id: string;
  email: string;
  source: string;
  consent_text: string | null;
  created_at: string;
  emails_sent_at: string | null;
  confirmed_at: string | null;
  provider_synced_at: string | null;
};

function fromRow(row: EmailSignupRow): EmailSignup {
  return {
    id: row.id,
    email: row.email,
    source: row.source,
    consentText: row.consent_text,
    createdAt: row.created_at,
    emailsSentAt: row.emails_sent_at,
    confirmedAt: row.confirmed_at,
    providerSyncedAt: row.provider_synced_at,
  };
}

export function wantsNewsletter(signup: Pick<EmailSignup, "consentText">): boolean {
  return signup.consentText !== null;
}

async function findSameSignupWithUnsentEmails(signup: EmailSignup): Promise<EmailSignup | null> {
  const since = new Date(Date.parse(signup.createdAt) - UNSENT_SIGNUP_REUSE_WINDOW_MS).toISOString();
  const rows = await dbQuery<EmailSignupRow>(
    `SELECT * FROM email_signups
      WHERE email = ? AND source = ? AND consent_text IS ? AND emails_sent_at IS NULL AND created_at > ?
      ORDER BY created_at DESC LIMIT 1`,
    [signup.email, signup.source, signup.consentText, since],
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function saveEmailSignup(args: {
  email: string;
  source: string;
  consentText: string | null;
  now?: Date;
}): Promise<EmailSignup> {
  const signup: EmailSignup = {
    id: crypto.randomUUID(),
    email: normalizeEmail(args.email),
    source: args.source,
    consentText: args.consentText,
    createdAt: (args.now ?? new Date()).toISOString(),
    emailsSentAt: null,
    confirmedAt: null,
    providerSyncedAt: null,
  };
  const earlier = await findSameSignupWithUnsentEmails(signup);
  if (earlier) return earlier;
  await dbExec(
    `INSERT INTO email_signups (id, email, source, consent_text, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [signup.id, signup.email, signup.source, signup.consentText, signup.createdAt],
  );
  return signup;
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

export async function markEmailsSent(id: string, now = new Date()): Promise<void> {
  await dbExec("UPDATE email_signups SET emails_sent_at = ? WHERE id = ?", [now.toISOString(), id]);
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
