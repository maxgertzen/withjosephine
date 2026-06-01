import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyRepair,
  classifyRow,
  normalizeEmail,
  runRepair,
  type ClassifiedRepair,
  type Deps,
  type DetectorRow,
} from "./repair-recipient-user-id.mts";

const baseRow: DetectorRow = {
  submission_id: "00000000-0000-0000-0000-000000000000",
  recipient_email: "recipient@example.com",
  purchaser_email: "purchaser@example.com",
  current_recipient_user_id: "user-purchaser",
  current_recipient_user_email: "purchaser@example.com",
  purchaser_user_id: "user-purchaser",
  gift_claimed_at: 1700000000000,
  delivered_at: null,
};

describe("normalizeEmail", () => {
  it("trims + lowercases", () => {
    expect(normalizeEmail("  Foo@Example.com  ")).toBe("foo@example.com");
  });
});

describe("classifyRow", () => {
  it("repairs bb5fe157-shape even when delivered_at is set (B5a dropped 2026-05-25)", () => {
    const lookup = (email: string) => (email === "recipient@example.com" ? { id: "user-recipient" } : null);
    const result = classifyRow({ ...baseRow, delivered_at: 1700000000001 }, lookup);
    expect(result.proposed_action).toBe("update");
  });

  it("ambiguous-skip when gift_claimed_at is null", () => {
    const lookup = () => ({ id: "user-recipient" });
    const result = classifyRow({ ...baseRow, gift_claimed_at: null }, lookup);
    expect(result.proposed_action).toBe("ambiguous-skip");
    expect(result.reason).toMatch(/gift_claimed_at/);
  });

  it("ambiguous-skip when current user is a third party (forwarded gift)", () => {
    const lookup = () => ({ id: "user-recipient" });
    const result = classifyRow(
      {
        ...baseRow,
        current_recipient_user_email: "spouse@example.com",
        current_recipient_user_id: "user-spouse",
      },
      lookup,
    );
    expect(result.proposed_action).toBe("ambiguous-skip");
    expect(result.reason).toMatch(/third-party|forwarded/);
  });

  it("update when bb5fe157 shape and target user exists", () => {
    const lookup = (email: string) => (email === "recipient@example.com" ? { id: "user-recipient" } : null);
    const result = classifyRow(baseRow, lookup);
    expect(result.proposed_action).toBe("update");
    expect(result.proposed_recipient_user_id).toBe("user-recipient");
  });

  it("create-then-update when bb5fe157 shape and target user is missing", () => {
    const lookup = () => null;
    const result = classifyRow(baseRow, lookup);
    expect(result.proposed_action).toBe("create-then-update");
    expect(result.proposed_recipient_user_id).toBeNull();
  });

  it("update when FK orphan (current_recipient_user_email is null) and target user exists", () => {
    const lookup = () => ({ id: "user-recipient" });
    const result = classifyRow(
      { ...baseRow, current_recipient_user_email: null, current_recipient_user_id: "stale-id" },
      lookup,
    );
    expect(result.proposed_action).toBe("update");
    expect(result.proposed_recipient_user_id).toBe("user-recipient");
  });

  it("create-then-update when FK orphan and target user missing", () => {
    const lookup = () => null;
    const result = classifyRow(
      { ...baseRow, current_recipient_user_email: null, current_recipient_user_id: "stale-id" },
      lookup,
    );
    expect(result.proposed_action).toBe("create-then-update");
  });

  it("ambiguous-skip no-op when FK orphan but lookup returns the same stale id", () => {
    // FK-orphan shape: currentResolvedEmail = null (passes the third-party
    // gate). But userLookup happens to return a user whose id matches the
    // current (orphaned) recipient_user_id — defensive no-op safeguard.
    const lookup = () => ({ id: "stale-id" });
    const result = classifyRow(
      { ...baseRow, current_recipient_user_email: null, current_recipient_user_id: "stale-id" },
      lookup,
    );
    expect(result.proposed_action).toBe("ambiguous-skip");
    expect(result.reason).toMatch(/no-op/);
  });

  it("normalizes email case + whitespace when comparing", () => {
    const lookup = (email: string) => (email === "recipient@example.com" ? { id: "user-recipient" } : null);
    const result = classifyRow({ ...baseRow, recipient_email: "  Recipient@Example.com  " }, lookup);
    expect(result.proposed_action).toBe("update");
  });
});

// ---------------------------------------------------------------------------
// applyRepair write-path tests.
//
// Fake `execD1` is backed by an in-memory better-sqlite3 — same SQL dialect as
// D1 for the surface this script touches (INSERT … ON CONFLICT … RETURNING,
// UPDATE, SELECT). Sanity mirror is a vi.fn injected via Deps.
//
// We do NOT mock node:child_process — `vi.mock` from a `.ts` test file cannot
// reliably intercept `spawnSync` reached from a `.mts` import in this codebase
// (see memory `feedback_vi_mock_node_child_process_unreliable_in_mts.md`).
// The DI seam is the only safe path; the real execD1 additionally fails closed
// under VITEST as a defense-in-depth guard.
// ---------------------------------------------------------------------------

type DbRow = Record<string, unknown>;

function makeFakeDb(): Database.Database {
  const db = new Database(":memory:");
  // Minimal slice of the production schema — only what the script touches.
  db.exec(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE submissions (
      id TEXT PRIMARY KEY,
      email TEXT,
      recipient_email TEXT,
      recipient_user_id TEXT,
      purchaser_user_id TEXT,
      is_gift INTEGER NOT NULL DEFAULT 0,
      gift_claimed_at INTEGER,
      delivered_at INTEGER
    );
    CREATE TABLE recipient_user_id_repair_log (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      recipient_email_hash TEXT NOT NULL,
      old_recipient_user_id TEXT NOT NULL,
      new_recipient_user_id TEXT NOT NULL,
      proposed_action TEXT NOT NULL,
      status TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      failure_reason TEXT
    );
  `);
  return db;
}

function makeFakeDeps(db: Database.Database, opts: { mirrorImpl?: (submissionId: string, recipientUserId: string) => Promise<void> } = {}): {
  deps: Deps;
  execD1Calls: string[];
  mirrorCalls: Array<{ submissionId: string; recipientUserId: string }>;
} {
  const execD1Calls: string[] = [];
  const mirrorCalls: Array<{ submissionId: string; recipientUserId: string }> = [];
  const deps: Deps = {
    execD1: <T>(sql: string): T[] => {
      execD1Calls.push(sql);
      const trimmed = sql.trim();
      const head = trimmed.slice(0, 6).toUpperCase();
      if (head === "SELECT" || trimmed.toUpperCase().includes("RETURNING")) {
        const rows = db.prepare(sql).all() as DbRow[];
        return rows as T[];
      }
      db.prepare(sql).run();
      return [] as T[];
    },
    mirrorToSanity: opts.mirrorImpl
      ? async (submissionId, recipientUserId) => {
          mirrorCalls.push({ submissionId, recipientUserId });
          await opts.mirrorImpl!(submissionId, recipientUserId);
        }
      : async (submissionId, recipientUserId) => {
          mirrorCalls.push({ submissionId, recipientUserId });
        },
  };
  return { deps, execD1Calls, mirrorCalls };
}

function seedSubmission(db: Database.Database, overrides: Partial<DbRow> = {}): void {
  const row: DbRow = {
    id: baseRow.submission_id,
    email: baseRow.purchaser_email,
    recipient_email: baseRow.recipient_email,
    recipient_user_id: baseRow.current_recipient_user_id,
    purchaser_user_id: baseRow.purchaser_user_id,
    is_gift: 1,
    gift_claimed_at: baseRow.gift_claimed_at,
    delivered_at: baseRow.delivered_at,
    ...overrides,
  };
  db.prepare(
    `INSERT INTO submissions (id, email, recipient_email, recipient_user_id, purchaser_user_id, is_gift, gift_claimed_at, delivered_at)
     VALUES (@id, @email, @recipient_email, @recipient_user_id, @purchaser_user_id, @is_gift, @gift_claimed_at, @delivered_at)`,
  ).run(row);
}

function seedUser(db: Database.Database, args: { id: string; email: string }): void {
  const now = 1_700_000_000_000;
  db.prepare(
    `INSERT INTO user (id, email, name, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)`,
  ).run(args.id, args.email, now, now);
}

describe("applyRepair write path", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = makeFakeDb();
    // Defense-in-depth: confirm the real execD1's env guard is wired correctly
    // without disarming it. We don't set ALLOW_REAL_D1_IN_TESTS here because
    // every test below uses the injected fake, never the real impl.
    expect(process.env.VITEST).toBe("true");
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it("happy path: update repoints submission, inserts completed audit, mirrors to Sanity exactly once", async () => {
    seedUser(db, { id: "user-purchaser", email: "purchaser@example.com" });
    seedUser(db, { id: "user-recipient", email: "recipient@example.com" });
    seedSubmission(db);
    const { deps, mirrorCalls } = makeFakeDeps(db);

    const classified: ClassifiedRepair = {
      row: baseRow,
      proposed_action: "update",
      proposed_recipient_user_id: "user-recipient",
      reason: "test fixture: update path",
    };

    const result = await applyRepair(deps, "staging", classified);

    expect(result.status).toBe("completed");
    expect(result.reason).toBeNull();

    const submission = db
      .prepare("SELECT recipient_user_id FROM submissions WHERE id = ?")
      .get(baseRow.submission_id) as { recipient_user_id: string };
    expect(submission.recipient_user_id).toBe("user-recipient");

    const audit = db
      .prepare("SELECT status, new_recipient_user_id, old_recipient_user_id, proposed_action FROM recipient_user_id_repair_log WHERE submission_id = ?")
      .all(baseRow.submission_id) as Array<{
        status: string;
        new_recipient_user_id: string;
        old_recipient_user_id: string;
        proposed_action: string;
      }>;
    expect(audit).toHaveLength(1);
    expect(audit[0].status).toBe("completed");
    expect(audit[0].new_recipient_user_id).toBe("user-recipient");
    expect(audit[0].old_recipient_user_id).toBe("user-purchaser");
    expect(audit[0].proposed_action).toBe("update");

    expect(mirrorCalls).toEqual([
      { submissionId: baseRow.submission_id, recipientUserId: "user-recipient" },
    ]);
  });

  it("create-then-update with pre-existing recipient: ON CONFLICT returns existing user.id, no new user row created", async () => {
    seedUser(db, { id: "user-purchaser", email: "purchaser@example.com" });
    // Recipient user ALREADY exists. The create-then-update branch should hit
    // ON CONFLICT(email) DO UPDATE SET id=id RETURNING id and reuse this id.
    seedUser(db, { id: "user-recipient-preexisting", email: "recipient@example.com" });
    seedSubmission(db);
    const userCountBefore = (db.prepare("SELECT COUNT(*) AS n FROM user").get() as { n: number }).n;
    expect(userCountBefore).toBe(2);

    const { deps, mirrorCalls } = makeFakeDeps(db);

    const classified: ClassifiedRepair = {
      row: baseRow,
      proposed_action: "create-then-update",
      proposed_recipient_user_id: null,
      reason: "test fixture: create-then-update with pre-existing user",
    };

    const result = await applyRepair(deps, "staging", classified);

    expect(result.status).toBe("completed");

    const submission = db
      .prepare("SELECT recipient_user_id FROM submissions WHERE id = ?")
      .get(baseRow.submission_id) as { recipient_user_id: string };
    expect(submission.recipient_user_id).toBe("user-recipient-preexisting");

    const userCountAfter = (db.prepare("SELECT COUNT(*) AS n FROM user").get() as { n: number }).n;
    expect(userCountAfter).toBe(2);

    expect(mirrorCalls).toHaveLength(1);
    expect(mirrorCalls[0].recipientUserId).toBe("user-recipient-preexisting");
  });

  it("Sanity mirror failure: D1 update lands but audit ends in mirror-failed, returns mirror-failed", async () => {
    seedUser(db, { id: "user-purchaser", email: "purchaser@example.com" });
    seedUser(db, { id: "user-recipient", email: "recipient@example.com" });
    seedSubmission(db);

    const { deps } = makeFakeDeps(db, {
      mirrorImpl: async () => {
        throw new Error("sanity-network-unreachable");
      },
    });

    const classified: ClassifiedRepair = {
      row: baseRow,
      proposed_action: "update",
      proposed_recipient_user_id: "user-recipient",
      reason: "test fixture: mirror failure cascade",
    };

    const result = await applyRepair(deps, "staging", classified);

    expect(result.status).toBe("mirror-failed");
    expect(result.reason).toMatch(/sanity-network-unreachable/);

    // D1 UPDATE landed before the mirror — production behavior preserved.
    const submission = db
      .prepare("SELECT recipient_user_id FROM submissions WHERE id = ?")
      .get(baseRow.submission_id) as { recipient_user_id: string };
    expect(submission.recipient_user_id).toBe("user-recipient");

    const audit = db
      .prepare("SELECT status, failure_reason FROM recipient_user_id_repair_log WHERE submission_id = ?")
      .all(baseRow.submission_id) as Array<{ status: string; failure_reason: string | null }>;
    expect(audit).toHaveLength(1);
    expect(audit[0].status).toBe("mirror-failed");
    expect(audit[0].failure_reason).toMatch(/sanity-network-unreachable/);
  });

  it("ambiguous-skip never reaches applyRepair — defensive: invoking with unexpected action returns failed without mutation", async () => {
    // applyRepair is only ever called by main() for non-skip rows. As a
    // defense-in-depth check, an `ambiguous-skip` classification reaching
    // applyRepair (e.g. via a future refactor) must NOT write anything —
    // this exercises the "unexpected proposed_action" early return that is
    // the closest thing the script has to a dry-run within the apply path.
    seedUser(db, { id: "user-purchaser", email: "purchaser@example.com" });
    seedSubmission(db);
    const { deps, execD1Calls, mirrorCalls } = makeFakeDeps(db);

    const classified: ClassifiedRepair = {
      row: baseRow,
      proposed_action: "ambiguous-skip",
      proposed_recipient_user_id: null,
      reason: "test fixture: skip should not mutate",
    };

    const result = await applyRepair(deps, "staging", classified);

    expect(result.status).toBe("failed");
    expect(result.reason).toMatch(/unexpected proposed_action/);

    // Zero writes: no execD1 calls, no mirror calls.
    expect(execD1Calls).toHaveLength(0);
    expect(mirrorCalls).toHaveLength(0);

    const submission = db
      .prepare("SELECT recipient_user_id FROM submissions WHERE id = ?")
      .get(baseRow.submission_id) as { recipient_user_id: string };
    expect(submission.recipient_user_id).toBe("user-purchaser");

    const audit = db
      .prepare("SELECT COUNT(*) AS n FROM recipient_user_id_repair_log")
      .get() as { n: number };
    expect(audit.n).toBe(0);
  });
});

describe("runRepair main-flow dry-run (7e3rd74y)", () => {
  let db: Database.Database;
  let csvPath: string;

  beforeEach(() => {
    db = makeFakeDb();
    csvPath = `/tmp/repair-dry-run-${Date.now()}-${Math.random().toString(36).slice(2)}.csv`;
  });

  afterEach(() => {
    db.close();
    try {
      require("node:fs").unlinkSync(csvPath);
    } catch {
      // CSV may not exist on empty-detector path.
    }
  });

  it("with apply=false: detector runs, classification logs, but zero submissions or audit writes happen", async () => {
    seedUser(db, { id: "user-purchaser", email: "purchaser@example.com" });
    seedUser(db, { id: "user-recipient", email: "recipient@example.com" });
    seedSubmission(db);
    const { deps, mirrorCalls } = makeFakeDeps(db);

    const summary = await runRepair({ deps, env: "staging", apply: false, csvPath });

    expect(summary.appliedAny).toBe(false);
    expect(summary.completed).toBe(0);
    expect(summary.failed).toBe(0);

    const submissionAfter = db
      .prepare("SELECT recipient_user_id FROM submissions WHERE id = ?")
      .get(baseRow.submission_id) as { recipient_user_id: string };
    expect(submissionAfter.recipient_user_id).toBe(baseRow.current_recipient_user_id);

    const auditCount = db
      .prepare("SELECT COUNT(*) AS n FROM recipient_user_id_repair_log")
      .get() as { n: number };
    expect(auditCount.n).toBe(0);

    expect(mirrorCalls).toEqual([]);
  });

  it("with apply=true: applies updates, writes audit row, calls mirror", async () => {
    seedUser(db, { id: "user-purchaser", email: "purchaser@example.com" });
    seedUser(db, { id: "user-recipient", email: "recipient@example.com" });
    seedSubmission(db);
    const { deps, mirrorCalls } = makeFakeDeps(db);

    const summary = await runRepair({ deps, env: "staging", apply: true, csvPath });

    expect(summary.appliedAny).toBe(true);
    expect(summary.completed).toBe(1);

    const submissionAfter = db
      .prepare("SELECT recipient_user_id FROM submissions WHERE id = ?")
      .get(baseRow.submission_id) as { recipient_user_id: string };
    expect(submissionAfter.recipient_user_id).toBe("user-recipient");

    expect(mirrorCalls).toHaveLength(1);
  });
});
