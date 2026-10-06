import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import {
  followUpCommand,
  mirroredGiftsSql,
} from "./migrate-gift-records-to-submissions-2026-10.mts";

const BEFORE = "2026-10-01T00:00:00.000Z";
const TOUCHED = "2026-10-06T09:00:00.000Z";

function giftCodes(): Database.Database {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE gift_codes (id TEXT, status TEXT, updated_at TEXT)");
  const insert = db.prepare("INSERT INTO gift_codes VALUES (?, ?, ?)");
  for (const [id, status] of [
    ["g_active", "active"],
    ["g_cancelled", "cancelled"],
    ["g_expired", "expired"],
    ["g_pending", "pending"],
    ["g_redeemed", "redeemed"],
  ]) {
    insert.run(id, status, BEFORE);
  }
  return db;
}

describe("mirroredGiftsSql", () => {
  it("lists only the gifts that have a Studio doc", () => {
    const db = giftCodes();

    expect(db.prepare(mirroredGiftsSql(TOUCHED).select).all()).toEqual([
      { id: "g_active", status: "active" },
      { id: "g_cancelled", status: "cancelled" },
      { id: "g_redeemed", status: "redeemed" },
    ]);
  });

  it("touches updated_at on those gifts only, so the next reconcile run re-projects them", () => {
    const db = giftCodes();

    db.exec(mirroredGiftsSql(TOUCHED).touch);

    expect(db.prepare("SELECT id, updated_at FROM gift_codes ORDER BY id").all()).toEqual([
      { id: "g_active", updated_at: TOUCHED },
      { id: "g_cancelled", updated_at: TOUCHED },
      { id: "g_expired", updated_at: BEFORE },
      { id: "g_pending", updated_at: BEFORE },
      { id: "g_redeemed", updated_at: TOUCHED },
    ]);
  });
});

describe("followUpCommand", () => {
  it("forces reconcile-mirror on the dataset that was migrated", () => {
    expect(followUpCommand("staging")).toBe("bash scripts/force-cron.sh reconcile-mirror -");
    expect(followUpCommand("production")).toBe(
      "bash scripts/force-cron.sh reconcile-mirror - --prod",
    );
  });
});
