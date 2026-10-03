import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import {
  legacyEmailFiredSql,
  planSubmissionPatches,
  planTemplateMoves,
} from "./migrate-reading-delivery-names-2026-10.mts";

describe("legacyEmailFiredSql", () => {
  it("rewrites only the legacy types and keeps every other byte", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE submissions (id TEXT, emails_fired_json TEXT)");
    const legacy = JSON.stringify([
      { type: "order_confirmation", sentAt: "2026-09-01T00:00:00Z", resendId: "a" },
      { type: "day7-overdue-alert", sentAt: "2026-09-08T00:00:00Z", resendId: "b" },
      { type: "day7", sentAt: "2026-09-09T00:00:00Z", resendId: "c" },
    ]);
    const current = JSON.stringify([
      { type: "reading_delivery", sentAt: "2026-09-09T00:00:00Z", resendId: "d" },
    ]);
    const insert = db.prepare("INSERT INTO submissions VALUES (?, ?)");
    insert.run("sub_legacy", legacy);
    insert.run("sub_current", current);
    const sql = legacyEmailFiredSql();

    expect(db.prepare(sql.select).all()).toEqual([{ id: "sub_legacy" }]);
    db.exec(sql.update);

    expect(db.prepare(sql.select).all()).toEqual([]);
    const rows = db.prepare("SELECT id, emails_fired_json FROM submissions ORDER BY id").all();
    expect(rows).toEqual([
      { id: "sub_current", emails_fired_json: current },
      {
        id: "sub_legacy",
        emails_fired_json: legacy
          .replace('"type":"day7-overdue-alert"', '"type":"reading_overdue_alert"')
          .replace('"type":"day7"', '"type":"reading_delivery"'),
      },
    ]);
  });
});

describe("planSubmissionPatches", () => {
  it("sets the current type on each legacy entry by _key, guarded by _rev", () => {
    const plan = planSubmissionPatches([
      {
        _id: "sub_1",
        _rev: "rev_1",
        legacyEntries: [
          { _key: "day7-2026-09-09", type: "day7" },
          { _key: "alert-1", type: "day7-overdue-alert" },
        ],
      },
    ]);

    expect(plan).toEqual({
      patches: [
        {
          _id: "sub_1",
          _rev: "rev_1",
          set: {
            'emailsFired[_key=="day7-2026-09-09"].type': "reading_delivery",
            'emailsFired[_key=="alert-1"].type': "reading_overdue_alert",
          },
        },
      ],
      unaddressable: [],
    });
  });

  it("leaves a submission with a keyless legacy entry alone", () => {
    const plan = planSubmissionPatches([
      { _id: "sub_1", _rev: "rev_1", legacyEntries: [{ type: "day7" }] },
    ]);

    expect(plan).toEqual({ patches: [], unaddressable: ["sub_1"] });
  });
});

describe("planTemplateMoves", () => {
  it("copies the published and draft template to the new type without system fields", () => {
    const plan = planTemplateMoves([
      {
        _id: "emailDay7Delivery",
        _type: "emailDay7Delivery",
        _rev: "rev_1",
        _createdAt: "2026-05-01T00:00:00Z",
        _updatedAt: "2026-09-01T00:00:00Z",
        subjectTemplate: "Your {readingName} is ready",
        bodyIntro: [{ _type: "block", _key: "b1" }],
      },
      { _id: "drafts.emailDay7Delivery", _type: "emailDay7Delivery", heroLine: "Draft line" },
    ]);

    expect(plan).toEqual({
      moves: [
        {
          fromId: "emailDay7Delivery",
          copy: {
            _id: "emailReadingDelivery",
            _type: "emailReadingDelivery",
            subjectTemplate: "Your {readingName} is ready",
            bodyIntro: [{ _type: "block", _key: "b1" }],
          },
        },
        {
          fromId: "drafts.emailDay7Delivery",
          copy: {
            _id: "drafts.emailReadingDelivery",
            _type: "emailReadingDelivery",
            heroLine: "Draft line",
          },
        },
      ],
      conflicts: [],
    });
  });

  it("reports a conflict and moves nothing when the new template already exists", () => {
    const plan = planTemplateMoves([
      { _id: "emailDay7Delivery", _type: "emailDay7Delivery" },
      { _id: "emailReadingDelivery", _type: "emailReadingDelivery" },
    ]);

    expect(plan).toEqual({
      moves: [],
      conflicts: ["emailDay7Delivery -> emailReadingDelivery"],
    });
  });

  it("moves nothing once the template has been migrated", () => {
    expect(planTemplateMoves([{ _id: "emailReadingDelivery", _type: "emailReadingDelivery" }])).toEqual({
      moves: [],
      conflicts: [],
    });
  });
});
