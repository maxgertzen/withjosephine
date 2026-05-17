import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import type { SqlClient } from "@/lib/booking/persistence/sqlClient";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

function applySchema(db: Database.Database): void {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    db.exec(sql);
  }
}

function ensureFileDir(dbPath: string): void {
  if (dbPath === ":memory:") return;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function createSqliteClient(): SqlClient & { close: () => void } {
  const dbPath = process.env.BOOKING_DB_PATH ?? ".local/booking.db";
  ensureFileDir(dbPath);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applySchema(db);

  return {
    async query(sql, params = []) {
      const stmt = db.prepare(sql);
      return stmt.all(...(params as unknown[])) as never;
    },
    async exec(sql, params = []) {
      const stmt = db.prepare(sql);
      const info = stmt.run(...(params as unknown[]));
      return { rowsWritten: info.changes };
    },
    async batch(statements) {
      const txn = db.transaction((batch: ReadonlyArray<{ sql: string; params?: ReadonlyArray<unknown> }>) => {
        for (const s of batch) {
          db.prepare(s.sql).run(...((s.params ?? []) as unknown[]));
        }
      });
      txn(statements);
    },
    close() {
      db.close();
    },
  };
}
