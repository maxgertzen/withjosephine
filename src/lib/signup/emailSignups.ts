import "server-only";

import { normalizeEmail } from "@/lib/auth/users";
import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEVER_CONFIRMED_RETENTION_DAYS = 30;

export type EmailSignup = {
  id: string;
  email: string;
  source: string;
  wantsNewsletter: boolean;
  consentText: string | null;
  createdAt: string;
  confirmedAt: string | null;
  providerSyncedAt: string | null;
};

type EmailSignupRow = {
  id: string;
  email: string;
  source: string;
  wants_newsletter: number;
  consent_text: string | null;
  created_at: string;
  confirmed_at: string | null;
  provider_synced_at: string | null;
};

function fromRow(row: EmailSignupRow): EmailSignup {
  return {
    id: row.id,
    email: row.email,
    source: row.source,
    wantsNewsletter: row.wants_newsletter === 1,
    consentText: row.consent_text,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    providerSyncedAt: row.provider_synced_at,
  };
}

export async function saveEmailSignup(args: {
  email: string;
  source: string;
  consentText: string | null;
  now?: Date;
}): Promise<EmailSignup> {
  const wantsNewsletter = args.consentText !== null;
  const signup: EmailSignup = {
    id: crypto.randomUUID(),
    email: normalizeEmail(args.email),
    source: args.source,
    wantsNewsletter,
    consentText: args.consentText,
    createdAt: (args.now ?? new Date()).toISOString(),
    confirmedAt: null,
    providerSyncedAt: null,
  };
  await dbExec(
    `INSERT INTO email_signups (id, email, source, wants_newsletter, consent_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [signup.id, signup.email, signup.source, signup.wantsNewsletter ? 1 : 0, signup.consentText, signup.createdAt],
  );
  return signup;
}

export async function findEmailSignup(id: string): Promise<EmailSignup | null> {
  const rows = await dbQuery<EmailSignupRow>("SELECT * FROM email_signups WHERE id = ?", [id]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function markNewsletterConfirmed(id: string, now = new Date()): Promise<boolean> {
  const { rowsWritten } = await dbExec(
    `UPDATE email_signups SET confirmed_at = ?
      WHERE id = ? AND wants_newsletter = 1 AND confirmed_at IS NULL`,
    [now.toISOString(), id],
  );
  return rowsWritten > 0;
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
