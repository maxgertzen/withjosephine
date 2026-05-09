import "server-only";

/**
 * User identity for the listen-page magic-link auth.
 *
 * Email = identity. Repeat customers + gift recipients (Phase 5) share one
 * user record across all their submissions. Created server-side on first
 * paid event (Stripe webhook → applyPaidEvent → here). Never created via a
 * customer-facing signup.
 *
 * Spec: www/MEMORY/WORK/20260509-202915_phase1-magic-link-listen/PRD.md
 *   ISC-4 — getOrCreateUser is idempotent on email
 *   ISC-5 — called from Stripe webhook after submission paid-write
 *   ISC-6 — same email returns same userId, isNew=false
 */
import { dbQuery } from "@/lib/booking/persistence/sqlClient";

export type GetOrCreateUserResult = { userId: string; isNew: boolean };
export type UserRecord = { id: string; email: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type UpsertRow = { id: string; is_new: number };

export async function getOrCreateUser(args: {
  email: string;
  name?: string | null;
  now?: number;
}): Promise<GetOrCreateUserResult> {
  const email = normalizeEmail(args.email);
  if (!email) throw new Error("getOrCreateUser: email is required");

  const now = args.now ?? Date.now();
  const id = crypto.randomUUID();
  const name = args.name?.trim() || null;

  // Single-statement upsert: INSERT…ON CONFLICT DO UPDATE SET id=id (no-op
  // on the existing row) + RETURNING returns the canonical row's id whether
  // it was just inserted or already existed. The `(created_at = ?) AS is_new`
  // expression discriminates new-vs-existing without a second query —
  // collapses 2 RTT → 1 RTT for the existing-user case AND closes the
  // rows-written-as-discriminator portability risk (SQLite's behavior for
  // ON CONFLICT DO NOTHING's `changes()` count is implementation-defined).
  const rows = await dbQuery<UpsertRow>(
    `INSERT INTO user (id, email, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET id=id
     RETURNING id, (created_at = ?) AS is_new`,
    [id, email, name, now, now, now],
  );
  const row = rows[0];
  if (!row) {
    throw new Error(`getOrCreateUser: upsert returned no row for ${email}`);
  }
  return { userId: row.id, isNew: row.is_new === 1 };
}

/**
 * Lookup a user by email.
 *
 * **Enumeration-leak contract (LAUNCH-BLOCKING for callers):** any
 * customer-facing route that uses this function MUST treat null/non-null
 * identically in response shape AND timing. The auth design accepts
 * "attacker who already knows a customer's email can guess the link" but
 * MUST NOT leak "is this email a Josephine customer" via response
 * differential. POST /api/auth/magic-link MUST always return 204 + the
 * "Check your email" UX state regardless of result. See
 * `www/docs/POST_LAUNCH_BACKLOG.md` → A-2.
 */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const rows = await dbQuery<UserRecord>(
    `SELECT id, email FROM user WHERE email = ? LIMIT 1`,
    [normalized],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const rows = await dbQuery<UserRecord>(
    `SELECT id, email FROM user WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}
