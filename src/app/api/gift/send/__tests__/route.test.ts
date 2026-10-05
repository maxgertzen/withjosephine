import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __registerSqliteFactory,
  dbExec,
  dbQuery,
  type SqlClient,
} from "@/lib/booking/persistence/sqlClient";
import type { SanityReading } from "@/lib/sanity/types";
import { captureConsole } from "@/test/captureConsole";
import {
  auditRows,
  forceGiftStatus,
  giftWithSendToken,
  TEST_GIFT_INPUT,
} from "@/test/fixtures/gift";
import { createSqliteClient } from "@/test/persistence/sqliteClient";

vi.mock("@/lib/gift/giftRateLimit", () => ({
  checkGiftRateLimit: vi.fn(),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReadingPublished: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendGiftToRecipient: vi.fn(),
}));

import { getReadingById } from "@/data/readings";
import { siteOrigin } from "@/lib/env";
import { deriveGiftCode } from "@/lib/gift/giftCode";
import { formatGiftCode } from "@/lib/gift/giftCodeFormat";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";
import { findGiftById } from "@/lib/gift/gifts";
import { sendGiftToRecipient } from "@/lib/resend";
import { fetchReadingPublished } from "@/lib/sanity/fetch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockRateLimit = vi.mocked(checkGiftRateLimit);
const mockTurnstile = vi.mocked(verifyTurnstileToken);
const mockReading = vi.mocked(fetchReadingPublished);
const mockSend = vi.mocked(sendGiftToRecipient);

const BUYER_EMAIL = "buyer@example.com";
const RECIPIENT_NAME = "Anna";
const RECIPIENT_EMAIL = "anna@example.org";
const READING_NAME = "Birth Chart Reading";
const RESEND_ID = "re_gift_send_1";

let capturedConsole: ReturnType<typeof captureConsole>;
let secrets: string[];

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/gift/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.7" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function activeGift(): Promise<{ giftId: string; token: string; code: string }> {
  const { giftId, token } = await giftWithSendToken("active", { buyerEmail: BUYER_EMAIL });
  const code = await deriveGiftCode(giftId);
  secrets.push(token, code, formatGiftCode(code));
  return { giftId, token, code };
}

function sendBody(token: string, overrides: Record<string, unknown> = {}) {
  return {
    token,
    expectedSendCount: 0,
    recipientName: RECIPIENT_NAME,
    recipientEmail: RECIPIENT_EMAIL,
    turnstileToken: "turnstile-ok",
    ...overrides,
  };
}

async function giftRow(giftId: string) {
  const [row] = await dbQuery<{
    send_count: number;
    recipient_name: string | null;
    recipient_email: string | null;
    last_sent_at: string | null;
    emails_fired_json: string;
  }>(
    `SELECT send_count, recipient_name, recipient_email, last_sent_at, emails_fired_json
     FROM gift_codes WHERE id = ?`,
    [giftId],
  );
  return row;
}

function idempotencyKeys(): string[] {
  return mockSend.mock.calls.map(([, options]) => options.idempotencyKey);
}

function sendKey(giftId: string, sendNumber: 1 | 2, recipientEmail = RECIPIENT_EMAIL): string {
  const digest = createHash("sha256")
    .update(recipientEmail.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
  return `gift-send/${giftId}/${sendNumber}/${digest}`;
}

function sqliteFailingFirstBatches(failures: number, sqlFragment: string): () => SqlClient {
  return () => {
    const client = createSqliteClient();
    let remaining = failures;
    return {
      ...client,
      async batch(statements) {
        if (remaining > 0 && statements.some((statement) => statement.sql.includes(sqlFragment))) {
          remaining -= 1;
          throw new Error("D1 batch failed");
        }
        return client.batch(statements);
      },
    };
  };
}

function sqliteFailingExec(sqlFragment: string): () => SqlClient {
  return () => {
    const client = createSqliteClient();
    return {
      ...client,
      async exec(sql, params) {
        if (sql.includes(sqlFragment)) throw new Error("D1 exec failed");
        return client.exec(sql, params);
      },
    };
  };
}

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockRateLimit.mockReset().mockResolvedValue(true);
  mockTurnstile.mockReset().mockResolvedValue(true);
  mockReading.mockReset().mockResolvedValue({ name: READING_NAME } as SanityReading);
  mockSend.mockReset().mockResolvedValue({ kind: "sent", resendId: RESEND_ID });
  capturedConsole = captureConsole();
  secrets = [RECIPIENT_EMAIL];
});

afterEach(async () => {
  const logs = capturedConsole.text();
  const audit = JSON.stringify(await auditRows());
  for (const secret of secrets) {
    expect(logs).not.toContain(secret);
    expect(audit).not.toContain(secret);
  }
  vi.restoreAllMocks();
  __registerSqliteFactory(() => createSqliteClient());
});

describe("POST /api/gift/send guards", () => {
  it("returns 400 for an expectedSendCount of 2 without a limiter call", async () => {
    const res = await callRoute(sendBody("t", { expectedSendCount: 2 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("answers 404 invalid with an audit row and no Turnstile call for a bad token", async () => {
    const res = await callRoute(sendBody("not-a-token"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ state: "invalid" });
    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(mockTurnstile).not.toHaveBeenCalled();
    expect(await auditRows()).toEqual([
      { event_type: "gift_send_link_invalid", success: 0, submission_id: null },
    ]);
  });

  it("returns 429 when the limiter refuses a bad token", async () => {
    mockRateLimit.mockResolvedValueOnce(false);
    const res = await callRoute(sendBody("not-a-token"));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests" });
    expect(await auditRows()).toEqual([]);
  });

  it("returns 400 when Turnstile fails and claims nothing", async () => {
    mockTurnstile.mockResolvedValueOnce(false);
    const { giftId, token } = await activeGift();
    const res = await callRoute(sendBody(token));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Verification failed" });
    expect(mockTurnstile).toHaveBeenCalledWith("turnstile-ok", "203.0.113.7");
    expect(mockSend).not.toHaveBeenCalled();
    expect(await giftRow(giftId)).toMatchObject({ send_count: 0, recipient_email: null });
  });

  it.each([
    ["redeemed", { state: "opened" }],
    ["cancelled", { state: "invalid" }],
  ] as const)("returns 409 for a %s gift with its status body", async (status, expected) => {
    const { giftId, token } = await activeGift();
    await forceGiftStatus(giftId, status);
    const res = await callRoute(sendBody(token));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual(expected);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 500 send_failed for an active gift without a buyer email", async () => {
    const { giftId, token } = await activeGift();
    await dbExec(`UPDATE gift_codes SET buyer_email = NULL WHERE id = ?`, [giftId]);
    const res = await callRoute(sendBody(token));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "send_failed" });
    expect(mockSend).not.toHaveBeenCalled();
    expect(await giftRow(giftId)).toMatchObject({ send_count: 0 });
  });
});

describe("POST /api/gift/send recipient fields", () => {
  it.each([
    ["an empty name", { recipientName: "  " }, { recipientName: "required" }],
    ["a name of only braces", { recipientName: " {} " }, { recipientName: "required" }],
    ["a name over 80 characters", { recipientName: "a".repeat(81) }, { recipientName: "required" }],
    [
      "an email without a dot in the domain",
      { recipientEmail: "anna@emailcom" },
      { recipientEmail: "invalid_email" },
    ],
    [
      "the buyer email in another case",
      { recipientEmail: " BUYER@Example.com " },
      { recipientEmail: "own_email" },
    ],
    [
      "the buyer email with a +tag",
      { recipientEmail: "buyer+gift@example.com" },
      { recipientEmail: "own_email" },
    ],
  ])("returns 400 for %s and claims nothing", async (_label, fields, fieldErrors) => {
    const { giftId, token } = await activeGift();
    const res = await callRoute(sendBody(token, fields));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Validation failed", fieldErrors });
    expect(mockSend).not.toHaveBeenCalled();
    expect(await giftRow(giftId)).toMatchObject({ send_count: 0, recipient_name: null });
  });

  it("removes braces from the name and trims both fields", async () => {
    const { giftId, token } = await activeGift();
    const res = await callRoute(
      sendBody(token, { recipientName: " An{na} ", recipientEmail: ` ${RECIPIENT_EMAIL} ` }),
    );
    expect(res.status).toBe(200);
    expect(mockSend.mock.calls[0][0]).toMatchObject({
      recipientName: "Anna",
      recipientEmail: RECIPIENT_EMAIL,
    });
    expect(await giftRow(giftId)).toMatchObject({ recipient_name: "Anna" });
  });
});

describe("POST /api/gift/send success", () => {
  it("sends once, clears the address, records the email and audits the gift", async () => {
    const { giftId, token, code } = await activeGift();

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(200);
    const body = await res.json();
    const row = await giftRow(giftId);
    expect(body).toEqual({
      state: "sent",
      recipientName: RECIPIENT_NAME,
      lastSentAt: row.last_sent_at,
    });
    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      {
        giftId,
        recipientName: RECIPIENT_NAME,
        recipientEmail: RECIPIENT_EMAIL,
        buyerName: TEST_GIFT_INPUT.buyerFirstName,
        buyerEmail: BUYER_EMAIL,
        note: TEST_GIFT_INPUT.note,
        readingName: READING_NAME,
        code,
        giftUrl: `${siteOrigin()}/gift/${code}`,
      },
      { idempotencyKey: sendKey(giftId, 1) },
    );
    expect(mockReading).toHaveBeenCalledWith(TEST_GIFT_INPUT.readingSlug);
    expect(row).toMatchObject({
      send_count: 1,
      recipient_name: RECIPIENT_NAME,
      recipient_email: null,
    });
    expect(row.last_sent_at).not.toBeNull();
    expect((await findGiftById(giftId))?.emailsFired).toEqual([
      { type: "gift_send", sentAt: row.last_sent_at, resendId: RESEND_ID },
    ]);
    expect(await auditRows()).toEqual([
      { event_type: "gift_sent", success: 1, submission_id: `gift_${giftId}` },
    ]);
  });

  it("falls back to the bundled reading name when Sanity fails", async () => {
    mockReading.mockRejectedValueOnce(new Error("sanity down"));
    const { token } = await activeGift();
    const res = await callRoute(sendBody(token));
    expect(res.status).toBe(200);
    expect(mockSend.mock.calls[0][0].readingName).toBe(
      getReadingById(TEST_GIFT_INPUT.readingSlug)?.name,
    );
  });

  it("answers used on the resend with key 2 and refuses a third send", async () => {
    const { giftId, token } = await activeGift();
    expect((await callRoute(sendBody(token))).status).toBe(200);

    const resend = await callRoute(sendBody(token, { expectedSendCount: 1 }));
    expect(resend.status).toBe(200);
    expect(await resend.json()).toMatchObject({ state: "used", recipientName: RECIPIENT_NAME });

    const third = await callRoute(sendBody(token, { expectedSendCount: 1 }));
    expect(third.status).toBe(409);
    expect(await third.json()).toEqual({ state: "used" });

    expect(idempotencyKeys()).toEqual([sendKey(giftId, 1), sendKey(giftId, 2)]);
    expect(await giftRow(giftId)).toMatchObject({ send_count: 2, recipient_email: null });
  });

  it("returns 409 with the sent status when the expected count is stale", async () => {
    const { token } = await activeGift();
    await callRoute(sendBody(token));

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ state: "sent", recipientName: RECIPIENT_NAME });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("delivers one email for two parallel first sends", async () => {
    const { giftId, token } = await activeGift();

    const responses = await Promise.all([callRoute(sendBody(token)), callRoute(sendBody(token))]);

    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(await giftRow(giftId)).toMatchObject({ send_count: 1, recipient_email: null });
  });

  it.each([{ kind: "dry_run" }, { kind: "skipped", reason: "no_api_key" }] as const)(
    "counts a $kind send and sets last_sent_at without an emails_fired entry",
    async (result) => {
      mockSend.mockResolvedValueOnce(result);
      const { giftId, token } = await activeGift();

      const res = await callRoute(sendBody(token));

      expect(res.status).toBe(200);
      const row = await giftRow(giftId);
      expect(row).toMatchObject({ send_count: 1, recipient_email: null, emails_fired_json: "[]" });
      expect(row.last_sent_at).not.toBeNull();
      expect(await auditRows()).toEqual([
        { event_type: "gift_sent", success: 1, submission_id: `gift_${giftId}` },
      ]);
    },
  );
});

describe("POST /api/gift/send failures", () => {
  it("records the failed gift email for the recipient role, never the address", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "Resend 500", statusCode: 500 });
    const { giftId, token } = await activeGift();

    await callRoute(sendBody(token));

    const failures = (await findGiftById(giftId))?.emailFailures ?? [];
    expect(failures).toEqual([
      expect.objectContaining({
        emailType: "gift_send",
        kind: "send_error",
        recipient: "recipient",
        errorCode: "Resend 500",
        statusCode: 500,
      }),
    ]);
    expect(JSON.stringify(failures)).not.toContain(RECIPIENT_EMAIL);
  });

  it("releases the claim when Resend fails and the retry to the same address reuses key 1", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "Resend 500", statusCode: 500 });
    const { giftId, token } = await activeGift();

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "send_failed" });
    expect(await giftRow(giftId)).toMatchObject({
      send_count: 0,
      recipient_name: RECIPIENT_NAME,
      recipient_email: null,
      last_sent_at: null,
      emails_fired_json: "[]",
    });
    expect(await auditRows()).toEqual([
      { event_type: "gift_sent", success: 0, submission_id: `gift_${giftId}` },
    ]);

    const retry = await callRoute(sendBody(token, { recipientEmail: " Anna@Example.ORG " }));
    expect(retry.status).toBe(200);
    expect(idempotencyKeys()).toEqual([sendKey(giftId, 1), sendKey(giftId, 1)]);
  });

  it("uses a new key, without the address in it, when the retry goes to a corrected address", async () => {
    const correctedEmail = "anna@example.com";
    secrets.push(correctedEmail);
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "timeout" });
    const { giftId, token } = await activeGift();

    expect((await callRoute(sendBody(token))).status).toBe(502);
    expect((await callRoute(sendBody(token, { recipientEmail: correctedEmail }))).status).toBe(200);

    const keys = idempotencyKeys();
    expect(keys).toEqual([sendKey(giftId, 1), sendKey(giftId, 1, correctedEmail)]);
    expect(keys[0]).not.toBe(keys[1]);
    for (const key of keys) {
      expect(key).not.toContain("anna");
      expect(key).not.toContain("example");
    }
  });

  it("keeps the first recipient name and send date when the second send fails", async () => {
    const { giftId, token } = await activeGift();
    expect((await callRoute(sendBody(token))).status).toBe(200);
    const firstSend = await giftRow(giftId);
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "Resend 500", statusCode: 500 });
    secrets.push("ben@example.org");

    const res = await callRoute(
      sendBody(token, {
        expectedSendCount: 1,
        recipientName: "Ben",
        recipientEmail: "ben@example.org",
      }),
    );

    expect(res.status).toBe(502);
    expect(await giftRow(giftId)).toMatchObject({
      send_count: 1,
      recipient_name: RECIPIENT_NAME,
      recipient_email: null,
      last_sent_at: firstSend.last_sent_at,
    });
  });

  it("releases the claim and answers 502 when the send throws", async () => {
    mockSend.mockRejectedValueOnce(new Error(`Resend rejected ${RECIPIENT_EMAIL}`));
    const { giftId, token } = await activeGift();

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(502);
    expect(await giftRow(giftId)).toMatchObject({ send_count: 0, recipient_email: null });
  });

  it("sends nothing, claims nothing and answers 500 when the lookup hash does not match", async () => {
    const { giftId, token } = await activeGift();
    await dbExec(`UPDATE gift_codes SET lookup_hash = ? WHERE id = ?`, ["f".repeat(64), giftId]);

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "send_failed" });
    expect(mockSend).not.toHaveBeenCalled();
    expect(await giftRow(giftId)).toMatchObject({
      send_count: 0,
      recipient_name: null,
      recipient_email: null,
    });
  });
});

describe("POST /api/gift/send bookkeeping after the email went out", () => {
  it("answers 200 and clears the address when recording the send fails once", async () => {
    __registerSqliteFactory(sqliteFailingFirstBatches(1, "last_sent_at"));
    const { giftId, token } = await activeGift();

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ state: "sent", recipientName: RECIPIENT_NAME });
    const row = await giftRow(giftId);
    expect(row).toMatchObject({ send_count: 1, recipient_email: null });
    expect(row.last_sent_at).not.toBeNull();
    expect(capturedConsole.text()).toContain(`recording the sent email failed for gift ${giftId}`);
  });

  it("answers 200 when recording the send fails on both tries", async () => {
    __registerSqliteFactory(sqliteFailingFirstBatches(2, "last_sent_at"));
    const { giftId, token } = await activeGift();

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ state: "sent" });
    expect(await giftRow(giftId)).toMatchObject({ send_count: 1, last_sent_at: null });
  });

  it("answers 200 and records the send when the audit write fails", async () => {
    __registerSqliteFactory(sqliteFailingExec("INSERT INTO listen_audit"));
    const { giftId, token } = await activeGift();

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(200);
    expect(await giftRow(giftId)).toMatchObject({ send_count: 1, recipient_email: null });
    expect(await auditRows()).toEqual([]);
    expect(capturedConsole.text()).toContain(`audit of the sent email failed for gift ${giftId}`);
  });

  it("answers 502 and releases the claim when the audit of a failed send fails", async () => {
    __registerSqliteFactory(sqliteFailingExec("INSERT INTO listen_audit"));
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "Resend 500", statusCode: 500 });
    const { giftId, token } = await activeGift();

    const res = await callRoute(sendBody(token));

    expect(res.status).toBe(502);
    expect(await giftRow(giftId)).toMatchObject({ send_count: 0, recipient_email: null });
    expect(capturedConsole.text()).toContain(`audit of the failed send failed for gift ${giftId}`);
  });
});
