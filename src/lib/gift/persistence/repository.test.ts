import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __registerSqliteFactory,
  dbBatch,
  dbQuery,
  type SqlClient,
  type SqlValue,
} from "@/lib/booking/persistence/sqlClient";
import {
  createTestGift,
  forceGiftStatus,
  TEST_GIFT_CREATED_AT,
  TEST_GIFT_INPUT,
} from "@/test/fixtures/gift";
import { createSqliteClient } from "@/test/persistence/sqliteClient";

import { deriveGiftCode, giftLookupHash } from "../giftCode";
import { formatGiftCode } from "../giftCodeFormat";
import {
  appendGiftEmailFired,
  buildRedeemGiftStatement,
  claimGiftBuyerEmail,
  claimGiftSend,
  completeGiftSend,
  deleteExpiredGift,
  findGiftByCode,
  findGiftById,
  findGiftByStripeSessionId,
  listGiftsByStatusOlderThan,
  listGiftsUpdatedAfter,
  markGiftActive,
  markGiftExpired,
  releaseGiftBuyerEmailClaim,
  releaseGiftSend,
  updateGiftNote,
} from "../gifts";
import type { GiftStatus } from "../types";

const PAID_AT = "2026-10-01T10:05:00.000Z";
const LATER = "2026-10-02T10:00:00.000Z";

const PAID = {
  buyerEmail: "ada@example.com",
  stripeSessionId: "cs_test_1",
  activatedAt: PAID_AT,
};

function sendClaim(expectedSendCount: 0 | 1, recipientEmail = "grace@example.com") {
  return { expectedSendCount, recipientName: "Grace", recipientEmail, updatedAt: LATER };
}

function redeemStatement(giftId: string, submissionId: string, readingSlug = "birth-chart") {
  return buildRedeemGiftStatement({ giftId, readingSlug, submissionId, redeemedAt: LATER });
}

async function createActiveGift(stripeSessionId = "cs_test_1"): Promise<string> {
  const giftId = await createTestGift();
  await markGiftActive(giftId, { ...PAID, stripeSessionId });
  return giftId;
}

async function readColumn(giftId: string, column: string): Promise<SqlValue | undefined> {
  const rows = await dbQuery(`SELECT ${column} AS value FROM gift_codes WHERE id = ?`, [giftId]);
  return rows[0]?.value;
}

function sqliteClientReportingTwoRowsWritten(): SqlClient {
  const client = createSqliteClient();
  return {
    ...client,
    async exec(sql, params) {
      await client.exec(sql, params);
      return { rowsWritten: 2 };
    },
  };
}

function recordQueries(sink: string[]): () => SqlClient {
  return () => {
    const client = createSqliteClient();
    return {
      ...client,
      query<T extends Record<string, SqlValue>>(sql: string, params?: ReadonlyArray<SqlValue>) {
        sink.push(sql);
        return client.query<T>(sql, params);
      },
    };
  };
}

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  __registerSqliteFactory(() => createSqliteClient());
});

describe("gift repository against in-memory SQLite", () => {
  it("creates a pending gift that findGiftByCode finds by its display form", async () => {
    const giftId = await createTestGift();
    const code = await deriveGiftCode(giftId);

    const found = await findGiftByCode(formatGiftCode(code).toLowerCase());

    expect(found?.id).toBe(giftId);
    expect(found?.status).toBe("pending");
    expect(found?.lookupHash).toBe(await giftLookupHash(code));
    expect(found?.consentIpAddress).toBe("203.0.113.7");
    expect(found?.sendCount).toBe(0);
    expect(found?.emailsFired).toEqual([]);
  });

  it("returns null for malformed and unknown codes with one query each", async () => {
    const queries: string[] = [];
    __registerSqliteFactory(recordQueries(queries));
    await createTestGift();

    queries.length = 0;
    expect(await findGiftByCode("PREVIEW-GIFT")).toBeNull();
    expect(queries).toEqual([expect.stringContaining("WHERE lookup_hash = ?")]);

    queries.length = 0;
    expect(await findGiftByCode("K7M2-QX9P-H4TR")).toBeNull();
    expect(queries).toEqual([expect.stringContaining("WHERE lookup_hash = ?")]);
  });

  it("activates a pending gift, stores the email lower-cased and finds it by session", async () => {
    const giftId = await createTestGift();

    const activated = await markGiftActive(giftId, { ...PAID, buyerEmail: "  Ada@Example.COM " });

    expect(activated).toBe(true);
    const gift = await findGiftByStripeSessionId("cs_test_1");
    expect(gift?.id).toBe(giftId);
    expect(gift?.status).toBe("active");
    expect(gift?.buyerEmail).toBe("ada@example.com");
    expect(gift?.activatedAt).toBe(PAID_AT);
  });

  it("activates an expired gift", async () => {
    const giftId = await createTestGift();
    await forceGiftStatus(giftId, "expired");

    expect(await markGiftActive(giftId, PAID)).toBe(true);
  });

  it("writes the financial record in the same batch", async () => {
    const giftId = await createTestGift();

    await markGiftActive(giftId, PAID, {
      submissionId: giftId,
      userId: null,
      email: "ada@example.com",
      paidAt: PAID_AT,
      amountPaidCents: 8900,
      amountPaidCurrency: "usd",
      country: "GB",
      stripeSessionId: "cs_test_1",
    });

    const rows = await dbQuery<{ submission_id: string; retained_until: string }>(
      `SELECT submission_id, retained_until FROM financial_records WHERE stripe_session_id = ?`,
      ["cs_test_1"],
    );
    expect(rows).toEqual([{ submission_id: giftId, retained_until: "2032-10-01T10:05:00.000Z" }]);
  });

  it.each<GiftStatus>(["redeemed", "cancelled"])("does not activate a %s gift", async (status) => {
    const giftId = await createTestGift();
    await forceGiftStatus(giftId, status);

    expect(await markGiftActive(giftId, PAID)).toBe(false);
    expect((await findGiftById(giftId))?.stripeSessionId).toBeNull();
  });

  it("claims the buyer email on a redeemed gift but not on a cancelled one", async () => {
    const redeemedId = await createActiveGift("cs_test_1");
    await forceGiftStatus(redeemedId, "redeemed");
    const cancelledId = await createActiveGift("cs_test_2");
    await forceGiftStatus(cancelledId, "cancelled");

    expect((await claimGiftBuyerEmail(redeemedId, LATER))?.buyerEmailClaimedAt).toBe(LATER);
    expect(await claimGiftBuyerEmail(cancelledId, LATER)).toBeNull();
  });

  it("re-claims the buyer email after a release", async () => {
    const giftId = await createActiveGift();
    await claimGiftBuyerEmail(giftId, LATER);

    await releaseGiftBuyerEmailClaim(giftId, "2026-10-02T09:00:00.000Z");
    expect(await claimGiftBuyerEmail(giftId, LATER)).toBeNull();

    await releaseGiftBuyerEmailClaim(giftId, LATER);
    expect(await claimGiftBuyerEmail(giftId, LATER)).not.toBeNull();
  });

  it("allows two sends, clears the recipient email after each and refuses a third", async () => {
    const giftId = await createActiveGift();

    const first = await claimGiftSend(giftId, sendClaim(0));
    expect(first).toEqual({ sendNumber: 1 });
    expect(await readColumn(giftId, "recipient_email")).toBe("grace@example.com");

    await completeGiftSend(giftId, { sendNumber: 1, sentAt: LATER });
    expect(await readColumn(giftId, "recipient_email")).toBeNull();
    expect(await readColumn(giftId, "last_sent_at")).toBe(LATER);

    const second = await claimGiftSend(giftId, sendClaim(1, "grace@example.org"));
    expect(second).toEqual({ sendNumber: 2 });
    await completeGiftSend(giftId, { sendNumber: 2, sentAt: LATER });

    for (const expectedSendCount of [0, 1] as const) {
      expect(
        await claimGiftSend(giftId, sendClaim(expectedSendCount, "grace@example.net")),
      ).toBeNull();
    }
    expect(await readColumn(giftId, "send_count")).toBe(2);
  });

  it("does not send a cancelled gift", async () => {
    const giftId = await createActiveGift();
    await forceGiftStatus(giftId, "cancelled");

    expect(await claimGiftSend(giftId, sendClaim(0))).toBeNull();
  });

  it("ignores a release with a stale send number", async () => {
    const giftId = await createActiveGift();
    await claimGiftSend(giftId, sendClaim(0));
    await completeGiftSend(giftId, { sendNumber: 1, sentAt: LATER });
    await claimGiftSend(giftId, sendClaim(1, "grace@example.org"));

    await releaseGiftSend(giftId, { sendNumber: 1, keptRecipientName: "Ada", updatedAt: LATER });
    expect(await readColumn(giftId, "send_count")).toBe(2);
    expect(await readColumn(giftId, "recipient_email")).toBe("grace@example.org");
    expect(await readColumn(giftId, "recipient_name")).toBe("Grace");

    await releaseGiftSend(giftId, { sendNumber: 2, keptRecipientName: "Grace", updatedAt: LATER });
    expect(await readColumn(giftId, "send_count")).toBe(1);
    expect(await readColumn(giftId, "recipient_email")).toBeNull();
  });

  it("puts back the kept recipient name when a second send is released", async () => {
    const giftId = await createActiveGift();
    await claimGiftSend(giftId, { ...sendClaim(0), recipientName: "Anna" });
    await completeGiftSend(giftId, { sendNumber: 1, sentAt: LATER });
    await claimGiftSend(giftId, { ...sendClaim(1, "ben@example.org"), recipientName: "Ben" });

    await releaseGiftSend(giftId, { sendNumber: 2, keptRecipientName: "Anna", updatedAt: LATER });

    const gift = await findGiftById(giftId);
    expect(gift?.recipientName).toBe("Anna");
    expect(gift?.lastSentAt).toBe(LATER);
    expect(gift?.sendCount).toBe(1);
  });

  it("updates the note on an active gift only", async () => {
    const activeId = await createActiveGift("cs_test_1");
    const redeemedId = await createActiveGift("cs_test_2");
    await forceGiftStatus(redeemedId, "redeemed");
    const cancelledId = await createActiveGift("cs_test_3");
    await forceGiftStatus(cancelledId, "cancelled");
    const edit = { buyerFirstName: "Ada L.", note: "With love", updatedAt: LATER };

    expect(await updateGiftNote(activeId, edit)).toBe(true);
    expect(await updateGiftNote(redeemedId, edit)).toBe(false);
    expect(await updateGiftNote(cancelledId, edit)).toBe(false);

    const active = await findGiftById(activeId);
    expect(active?.buyerFirstName).toBe("Ada L.");
    expect(active?.note).toBe("With love");
    expect((await findGiftById(redeemedId))?.note).toBe(TEST_GIFT_INPUT.note);
  });

  it("does not redeem a cancelled gift or a gift for another reading", async () => {
    const cancelledId = await createActiveGift("cs_test_1");
    await forceGiftStatus(cancelledId, "cancelled");
    const activeId = await createActiveGift("cs_test_2");

    await dbBatch([
      redeemStatement(cancelledId, "sub_a"),
      redeemStatement(activeId, "sub_b", "soul-blueprint"),
    ]);

    expect((await findGiftById(cancelledId))?.status).toBe("cancelled");
    expect((await findGiftById(activeId))?.status).toBe("active");
  });

  it("expires only pending gifts", async () => {
    const pendingId = await createTestGift();
    const activeId = await createActiveGift();

    expect(await markGiftExpired(pendingId, { expiredAt: LATER })).toBe(true);
    expect(await markGiftExpired(pendingId, { expiredAt: LATER })).toBe(false);
    expect(await markGiftExpired(activeId, { expiredAt: LATER })).toBe(false);

    const expired = await findGiftById(pendingId);
    expect(expired?.status).toBe("expired");
    expect(expired?.expiredAt).toBe(LATER);
    expect((await findGiftById(activeId))?.status).toBe("active");
  });

  it("deletes expired gifts and refuses active ones", async () => {
    const expiredId = await createTestGift();
    await markGiftExpired(expiredId, { expiredAt: LATER });
    const activeId = await createActiveGift();

    expect(await deleteExpiredGift(activeId)).toBe(false);
    expect(await findGiftById(activeId)).not.toBeNull();
    expect(await deleteExpiredGift(expiredId)).toBe(true);
    expect(await findGiftById(expiredId)).toBeNull();
  });

  it("lists gifts by status older than the cutoff", async () => {
    const oldId = await createTestGift({ createdAt: "2026-09-01T10:00:00.000Z" });
    await createTestGift({ createdAt: "2026-10-01T10:00:00.000Z" });

    const listed = await listGiftsByStatusOlderThan("pending", "2026-09-15T00:00:00.000Z");

    expect(listed.map((gift) => gift.id)).toEqual([oldId]);
  });

  it("lists active, redeemed and cancelled gifts updated after the cutoff", async () => {
    await createTestGift();
    const expiredId = await createTestGift();
    await markGiftExpired(expiredId, { expiredAt: LATER });
    const activeId = await createActiveGift("cs_test_1");
    const redeemedId = await createActiveGift("cs_test_2");
    await forceGiftStatus(redeemedId, "redeemed");
    const cancelledId = await createActiveGift("cs_test_3");
    await forceGiftStatus(cancelledId, "cancelled");

    const listed = await listGiftsUpdatedAfter(TEST_GIFT_CREATED_AT);

    expect(listed.map((gift) => gift.id).sort()).toEqual(
      [activeId, redeemedId, cancelledId].sort(),
    );
  });

  it("appends email fired entries", async () => {
    const giftId = await createActiveGift();
    const entry = { type: "gift_confirmation" as const, sentAt: LATER, resendId: "re_1" };

    await appendGiftEmailFired(giftId, entry);
    await appendGiftEmailFired(giftId, { ...entry, type: "gift_send", resendId: null });

    const gift = await findGiftById(giftId);
    expect(gift?.emailsFired).toEqual([entry, { ...entry, type: "gift_send", resendId: null }]);
    expect(gift?.updatedAt).toBe(LATER);
  });
});

describe.each([
  ["the SQLite client", () => createSqliteClient()],
  ["a client whose exec always reports rowsWritten 2", sqliteClientReportingTwoRowsWritten],
])("gift claims with %s", (_label, factory) => {
  beforeEach(() => {
    __registerSqliteFactory(factory);
  });

  it("activates once and keeps the first session", async () => {
    const giftId = await createActiveGift("cs_test_1");

    expect(await markGiftActive(giftId, { ...PAID, stripeSessionId: "cs_test_2" })).toBe(false);
    expect((await findGiftById(giftId))?.stripeSessionId).toBe("cs_test_1");
  });

  it("gives the buyer email claim to one of two parallel callers", async () => {
    const giftId = await createActiveGift();

    const results = await Promise.all([
      claimGiftBuyerEmail(giftId, LATER),
      claimGiftBuyerEmail(giftId, LATER),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("gives the first send to one of two parallel callers", async () => {
    const giftId = await createActiveGift();
    const results = await Promise.all([
      claimGiftSend(giftId, sendClaim(0)),
      claimGiftSend(giftId, sendClaim(0)),
    ]);

    expect(results.filter(Boolean)).toEqual([{ sendNumber: 1 }]);
    expect(await readColumn(giftId, "send_count")).toBe(1);
  });

  it("redeems once when two redeem batches run in parallel", async () => {
    const giftId = await createActiveGift();
    const redeemWith = (submissionId: string) => dbBatch([redeemStatement(giftId, submissionId)]);

    await Promise.all([redeemWith("sub_a"), redeemWith("sub_b")]);

    const gift = await findGiftById(giftId);
    expect(gift?.status).toBe("redeemed");
    expect(["sub_a", "sub_b"]).toContain(gift?.redeemedSubmissionId);
    expect(gift?.note).toBeNull();
    expect(gift?.recipientEmail).toBeNull();
    const redeemedRows = await dbQuery(
      `SELECT id FROM gift_codes WHERE redeemed_submission_id IS NOT NULL`,
    );
    expect(redeemedRows).toHaveLength(1);
  });

  it("refuses the note edit once the gift is redeemed", async () => {
    const giftId = await createActiveGift();
    await dbBatch([redeemStatement(giftId, "sub_a")]);

    expect(
      await updateGiftNote(giftId, { buyerFirstName: "Ada", note: "Edited", updatedAt: LATER }),
    ).toBe(false);
  });

  it("expires and deletes once", async () => {
    const giftId = await createTestGift();

    const expired = await Promise.all([
      markGiftExpired(giftId, { expiredAt: LATER }),
      markGiftExpired(giftId, { expiredAt: LATER }),
    ]);
    expect(expired.filter(Boolean)).toHaveLength(1);

    const deleted = await Promise.all([deleteExpiredGift(giftId), deleteExpiredGift(giftId)]);
    expect(deleted.filter(Boolean)).toHaveLength(1);
  });
});
