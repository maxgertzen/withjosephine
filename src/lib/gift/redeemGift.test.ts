import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { scheduled } = vi.hoisted(() => ({ scheduled: [] as Array<Promise<unknown>> }));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    ctx: { waitUntil: (promise: Promise<unknown>) => scheduled.push(promise) },
  }),
}));

vi.mock("@/lib/auth/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/users")>()),
  getOrCreateUser: vi.fn(),
}));

vi.mock("@/lib/booking/notifyPaid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/booking/notifyPaid")>();
  return { ...actual, afterSubmissionPaid: vi.fn(actual.afterSubmissionPaid) };
});

vi.mock("@/lib/booking/persistence/sanityMirror", () => ({
  mirrorAppendEmailFired: vi.fn(async () => undefined),
  mirrorSubmissionPatch: vi.fn(async () => undefined),
}));

vi.mock("./giftSubmissionMirror", () => ({
  mirrorGiftSubmission: vi.fn(async () => undefined),
  writeGiftRedemption: vi.fn(async () => true),
}));

vi.mock("@/lib/booking/dataExportUrl", () => ({
  mintDataExportUrl: vi.fn(async () => undefined),
}));

vi.mock("@/lib/resend", () => ({
  sendNotificationToJosephine: vi.fn(),
  sendCustomerConfirmation: vi.fn(),
  sendGiftOpened: vi.fn(),
}));

vi.mock("./gifts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gifts")>();
  return { ...actual, resolveGiftState: vi.fn(actual.resolveGiftState) };
});

import { getOrCreateUser } from "@/lib/auth/users";
import { afterSubmissionPaid } from "@/lib/booking/notifyPaid";
import {
  __registerSqliteFactory,
  dbExec,
  dbQuery,
  type SqlClient,
} from "@/lib/booking/persistence/sqlClient";
import {
  sendCustomerConfirmation,
  sendGiftOpened,
  sendNotificationToJosephine,
} from "@/lib/resend";
import { captureConsole } from "@/test/captureConsole";
import { auditRows, createTestGift, forceGiftStatus } from "@/test/fixtures/gift";
import { createSqliteClient } from "@/test/persistence/sqliteClient";

import { deriveGiftCode } from "./giftCode";
import { formatGiftCode } from "./giftCodeFormat";
import { findGiftById, resolveGiftState } from "./gifts";
import { mirrorGiftSubmission, writeGiftRedemption } from "./giftSubmissionMirror";
import { redeemGiftSubmission, type RedeemGiftSubmissionInput } from "./redeemGift";

const mockGetOrCreateUser = vi.mocked(getOrCreateUser);
const mockAfterPaid = vi.mocked(afterSubmissionPaid);
const mockWriteRedemption = vi.mocked(writeGiftRedemption);
const mockMirrorGiftSubmission = vi.mocked(mirrorGiftSubmission);
const mockResolveGiftState = vi.mocked(resolveGiftState);
const mockJosephine = vi.mocked(sendNotificationToJosephine);
const mockCustomerConfirmation = vi.mocked(sendCustomerConfirmation);
const mockGiftOpened = vi.mocked(sendGiftOpened);

async function runScheduled(): Promise<void> {
  while (scheduled.length > 0) await Promise.all(scheduled.splice(0));
}

const ACKNOWLEDGED_AT = "2026-10-04T09:30:00.000Z";
const RESPONSES = [
  {
    fieldKey: "first_name",
    fieldLabelSnapshot: "First name",
    fieldType: "shortText",
    value: "Anna",
  },
  { fieldKey: "email", fieldLabelSnapshot: "Email", fieldType: "email", value: "anna@example.com" },
];

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

async function createActiveGift(): Promise<{ giftId: string; code: string }> {
  const giftId = await createTestGift();
  await forceGiftStatus(giftId, "active");
  await dbExec(`UPDATE gift_codes SET buyer_email = ?, recipient_email = ? WHERE id = ?`, [
    "marguerite@example.com",
    "anna@example.com",
    giftId,
  ]);
  return { giftId, code: await deriveGiftCode(giftId) };
}

function redeemInput(
  code: string,
  overrides: Partial<RedeemGiftSubmissionInput["submission"]> = {},
): RedeemGiftSubmissionInput {
  return {
    request: new Request("https://withjosephine.com/api/booking", {
      headers: { "user-agent": "vitest" },
    }),
    code,
    submission: {
      email: "anna@example.com",
      readingSlug: "birth-chart",
      readingName: "Birth Chart Reading",
      readingPriceDisplay: "$89",
      responses: RESPONSES,
      consentLabel: "art6 | art9 | cooling-off",
      photoR2Key: null,
      createdAt: ACKNOWLEDGED_AT,
      consentAcknowledgedAt: ACKNOWLEDGED_AT,
      ipAddress: "203.0.113.9",
      art6AcknowledgedAt: ACKNOWLEDGED_AT,
      art9AcknowledgedAt: ACKNOWLEDGED_AT,
      coolingOffAcknowledgedAt: ACKNOWLEDGED_AT,
      ...overrides,
    },
  };
}

async function submissionsForGift(giftId: string) {
  return dbQuery<{
    id: string;
    status: string;
    paid_at: string | null;
    cooling_off_acknowledged_at: string | null;
    recipient_user_id: string | null;
    is_gift: number;
    stripe_event_id: string | null;
  }>(
    `SELECT id, status, paid_at, cooling_off_acknowledged_at, recipient_user_id, is_gift,
            stripe_event_id
       FROM submissions WHERE gift_code_id = ?`,
    [giftId],
  );
}

let capturedConsole: ReturnType<typeof captureConsole>;
let codesInPlay: string[];

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  mockGetOrCreateUser.mockReset().mockResolvedValue({ userId: "user_anna", isNew: true });
  mockAfterPaid.mockClear();
  mockWriteRedemption.mockReset().mockResolvedValue(true);
  mockMirrorGiftSubmission.mockReset().mockResolvedValue(undefined);
  mockJosephine.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_j" });
  mockCustomerConfirmation.mockReset().mockResolvedValue({
    firedType: "gift_recipient_confirmation",
    result: { kind: "sent", resendId: "msg_grc" },
  });
  mockGiftOpened.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_go" });
  scheduled.length = 0;
  mockResolveGiftState.mockClear();
  capturedConsole = captureConsole();
  codesInPlay = [];
});

afterEach(() => {
  const logs = capturedConsole.text();
  for (const code of codesInPlay) {
    expect(logs).not.toContain(code);
    expect(logs).not.toContain(formatGiftCode(code));
  }
  vi.restoreAllMocks();
});

async function expectOnePaidSubmissionInTheRedeemBatch() {
  const { giftId, code } = await createActiveGift();
  codesInPlay.push(code);

  const result = await redeemGiftSubmission(redeemInput(code));

  expect(result).toEqual({ kind: "redeemed", submissionId: giftId });
  const submissionId = giftId;
  expect(await submissionsForGift(giftId)).toEqual([
    {
      id: submissionId,
      status: "paid",
      paid_at: ACKNOWLEDGED_AT,
      cooling_off_acknowledged_at: ACKNOWLEDGED_AT,
      recipient_user_id: "user_anna",
      is_gift: 0,
      stripe_event_id: expect.stringMatching(/^gift-redeem:[0-9a-f-]{36}$/),
    },
  ]);
  expect(await findGiftById(giftId)).toMatchObject({
    status: "redeemed",
    redeemedSubmissionId: submissionId,
    redeemedAt: ACKNOWLEDGED_AT,
    note: null,
    recipientEmail: null,
  });
}

async function expectOneOfTwoParallelRedeemsToWin() {
  const { giftId, code } = await createActiveGift();
  codesInPlay.push(code);
  let releaseBoth: () => void = () => {};
  const bothPastTheRead = new Promise<void>((resolve) => {
    releaseBoth = resolve;
  });
  mockGetOrCreateUser.mockImplementation(async () => {
    if (mockGetOrCreateUser.mock.calls.length === 2) releaseBoth();
    await bothPastTheRead;
    return { userId: "user_anna", isNew: false };
  });

  const results = await Promise.all([
    redeemGiftSubmission(redeemInput(code)),
    redeemGiftSubmission(redeemInput(code)),
  ]);

  expect(mockResolveGiftState.mock.results.map((call) => call.value)).toEqual(["active", "active"]);
  expect(results.map((result) => result.kind).sort()).toEqual(["already_redeemed", "redeemed"]);
  expect(results).toContainEqual({ kind: "redeemed", submissionId: giftId });
  expect(await submissionsForGift(giftId)).toHaveLength(1);
  await runScheduled();
  expect(mockAfterPaid).toHaveBeenCalledOnce();
  expect(mockWriteRedemption).toHaveBeenCalledOnce();
  expect(mockMirrorGiftSubmission).not.toHaveBeenCalled();
}

const HAPPY_PATH = "marks the gift redeemed and inserts one paid submission in the same batch";
const PARALLEL_RACE =
  "gives one of two parallel redeems the submission and the other already_redeemed";

describe("redeemGiftSubmission", () => {
  it(HAPPY_PATH, expectOnePaidSubmissionInTheRedeemBatch);

  it(PARALLEL_RACE, expectOneOfTwoParallelRedeemsToWin);

  it("refuses a code for another reading without writing", async () => {
    const { giftId, code } = await createActiveGift();
    codesInPlay.push(code);

    const result = await redeemGiftSubmission(redeemInput(code, { readingSlug: "soul-blueprint" }));

    expect(result).toEqual({ kind: "other_reading", readingSlug: "birth-chart" });
    expect(await submissionsForGift(giftId)).toEqual([]);
    expect((await findGiftById(giftId))?.status).toBe("active");
  });

  it("answers already_redeemed for a redeemed code and not_active for a cancelled one", async () => {
    const redeemed = await createActiveGift();
    const cancelled = await createActiveGift();
    codesInPlay.push(redeemed.code, cancelled.code);
    await forceGiftStatus(redeemed.giftId, "redeemed");
    await forceGiftStatus(cancelled.giftId, "cancelled");

    expect(await redeemGiftSubmission(redeemInput(redeemed.code))).toEqual({
      kind: "already_redeemed",
    });
    expect(await redeemGiftSubmission(redeemInput(cancelled.code))).toEqual({ kind: "not_active" });
    expect(mockGetOrCreateUser).not.toHaveBeenCalled();
  });

  it.each(["AAAAAAAAAAAA", "x"])(
    "answers not_found for %s and writes an invalid code audit row",
    async (code) => {
      expect(await redeemGiftSubmission(redeemInput(code))).toEqual({ kind: "not_found" });
      expect(await auditRows()).toEqual([
        { event_type: "gift_code_invalid", success: 0, submission_id: null },
      ]);
    },
  );

  it("answers not_found for a pending gift", async () => {
    const giftId = await createTestGift();
    const code = await deriveGiftCode(giftId);
    codesInPlay.push(code);

    expect(await redeemGiftSubmission(redeemInput(code))).toEqual({ kind: "not_found" });
  });

  it("writes a redeemed audit row with the recipient's submission id", async () => {
    const { code } = await createActiveGift();
    codesInPlay.push(code);

    const result = await redeemGiftSubmission(redeemInput(code));

    expect(await auditRows()).toEqual([
      {
        event_type: "gift_redeemed",
        success: 1,
        submission_id: (result as { submissionId: string }).submissionId,
      },
    ]);
  });

  it("mirrors the paid submission with the buyer's first name only and runs the paid dispatch", async () => {
    const { giftId, code } = await createActiveGift();
    codesInPlay.push(code);

    const result = await redeemGiftSubmission(redeemInput(code));
    const submissionId = (result as { submissionId: string }).submissionId;
    await runScheduled();

    const [submission, storedGift] = mockWriteRedemption.mock.calls[0]!;
    expect(submission).toMatchObject({
      id: submissionId,
      status: "paid",
      paidAt: ACKNOWLEDGED_AT,
      consentAcknowledgedAt: ACKNOWLEDGED_AT,
      ipAddress: "203.0.113.9",
      art6AcknowledgedAt: ACKNOWLEDGED_AT,
      art9AcknowledgedAt: ACKNOWLEDGED_AT,
      coolingOffAcknowledgedAt: ACKNOWLEDGED_AT,
    });
    expect(storedGift).toMatchObject({
      id: giftId,
      status: "redeemed",
      redeemedAt: ACKNOWLEDGED_AT,
      buyerFirstName: "Marguerite",
    });
    expect(mockAfterPaid).toHaveBeenCalledWith({
      submissionId,
      context: expect.objectContaining({
        id: submissionId,
        email: "anna@example.com",
        firstName: "Anna",
        readingName: "Birth Chart Reading",
        amountPaidDisplay: null,
      }),
      recipientUserId: "user_anna",
      emailsFired: [],
      gift: {
        id: giftId,
        buyerFirstName: "Marguerite",
        buyerEmail: "marguerite@example.com",
        emailsFired: [],
      },
    });
  });

  it("redeems with a null recipient user when user creation fails", async () => {
    const { giftId, code } = await createActiveGift();
    codesInPlay.push(code);
    mockGetOrCreateUser.mockRejectedValueOnce(new Error("D1 busy"));

    expect((await redeemGiftSubmission(redeemInput(code))).kind).toBe("redeemed");
    expect((await submissionsForGift(giftId))[0]?.recipient_user_id).toBeNull();
  });
});

async function submissionEmailsFired(submissionId: string): Promise<string[]> {
  const [row] = await dbQuery<{ emails_fired_json: string }>(
    `SELECT emails_fired_json FROM submissions WHERE id = ?`,
    [submissionId],
  );
  return (JSON.parse(row!.emails_fired_json) as Array<{ type: string }>)
    .map((entry) => entry.type)
    .sort();
}

async function giftEmailsFired(giftId: string): Promise<string[]> {
  return ((await findGiftById(giftId))?.emailsFired ?? []).map((entry) => entry.type).sort();
}

describe("redeemGiftSubmission completion after the commit", () => {
  it("answers before the Studio mirror and the emails, and mirrors before any email", async () => {
    const { code } = await createActiveGift();
    codesInPlay.push(code);
    let finishMirror: () => void = () => {};
    mockWriteRedemption.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishMirror = () => resolve(true);
        }),
    );

    const result = await redeemGiftSubmission(redeemInput(code));

    expect(result.kind).toBe("redeemed");
    expect(mockWriteRedemption).toHaveBeenCalledOnce();
    expect(mockAfterPaid).not.toHaveBeenCalled();
    expect(mockJosephine).not.toHaveBeenCalled();
    finishMirror();
    await runScheduled();
    expect(mockJosephine).toHaveBeenCalledOnce();
    expect(mockCustomerConfirmation).toHaveBeenCalledOnce();
    expect(mockGiftOpened).toHaveBeenCalledOnce();
  });

  it("records the sent emails on the submission and the gift", async () => {
    const { giftId, code } = await createActiveGift();
    codesInPlay.push(code);

    const result = await redeemGiftSubmission(redeemInput(code));
    await runScheduled();

    const submissionId = (result as { submissionId: string }).submissionId;
    expect(await submissionEmailsFired(submissionId)).toEqual(["gift_recipient_confirmation"]);
    expect(await giftEmailsFired(giftId)).toEqual(["gift_opened"]);
  });
});

describe("redeemGiftSubmission for a gift that is already redeemed", () => {
  const RETRIED_AT = "2026-10-04T09:45:00.000Z";

  it("answers a repeat from the same email and reading with the redeemed submission", async () => {
    const { giftId, code } = await createActiveGift();
    codesInPlay.push(code);
    const first = await redeemGiftSubmission(redeemInput(code));
    await runScheduled();

    const retry = await redeemGiftSubmission(
      redeemInput(code, { email: "Anna@Example.com", createdAt: RETRIED_AT }),
    );

    expect(retry).toEqual(first);
    expect(await submissionsForGift(giftId)).toHaveLength(1);
    expect(await auditRows()).toHaveLength(1);
  });

  it("answers already_redeemed to a repeat with another email or another reading", async () => {
    const { code } = await createActiveGift();
    codesInPlay.push(code);
    await redeemGiftSubmission(redeemInput(code));
    await runScheduled();

    expect(await redeemGiftSubmission(redeemInput(code, { email: "someone@example.com" }))).toEqual(
      {
        kind: "already_redeemed",
      },
    );
    expect(
      await redeemGiftSubmission(redeemInput(code, { readingSlug: "soul-blueprint" })),
    ).toEqual({
      kind: "already_redeemed",
    });
    expect(scheduled).toHaveLength(0);
  });

  it("resends only the Josephine notification, under its key, when the repeat finds the rest recorded", async () => {
    const { code } = await createActiveGift();
    codesInPlay.push(code);
    await redeemGiftSubmission(redeemInput(code));
    await runScheduled();

    await redeemGiftSubmission(redeemInput(code, { createdAt: RETRIED_AT }));
    await runScheduled();

    const josephineKeys = mockJosephine.mock.calls.map(([, options]) => options?.idempotencyKey);
    expect(josephineKeys).toHaveLength(2);
    expect(new Set(josephineKeys).size).toBe(1);
    expect(mockCustomerConfirmation).toHaveBeenCalledOnce();
    expect(mockGiftOpened).toHaveBeenCalledOnce();
  });

  it("heals the Studio document and the missing email when the first completion stopped midway", async () => {
    const { giftId, code } = await createActiveGift();
    codesInPlay.push(code);
    mockCustomerConfirmation.mockRejectedValueOnce(new Error("Resend unreachable"));
    const first = await redeemGiftSubmission(redeemInput(code));
    await runScheduled();
    const submissionId = (first as { submissionId: string }).submissionId;
    expect(await submissionEmailsFired(submissionId)).toEqual([]);

    await redeemGiftSubmission(
      redeemInput(code, { createdAt: RETRIED_AT, ipAddress: "198.51.100.4" }),
    );
    await runScheduled();

    expect(mockWriteRedemption).toHaveBeenCalledTimes(2);
    const [submission, storedGift] = mockWriteRedemption.mock.calls[1]!;
    expect(submission).toMatchObject({
      id: submissionId,
      email: "anna@example.com",
      status: "paid",
      readingSlug: "birth-chart",
      responses: RESPONSES,
      createdAt: ACKNOWLEDGED_AT,
      paidAt: ACKNOWLEDGED_AT,
      recipientUserId: "user_anna",
      consentAcknowledgedAt: ACKNOWLEDGED_AT,
      ipAddress: "198.51.100.4",
      art6AcknowledgedAt: ACKNOWLEDGED_AT,
      art9AcknowledgedAt: ACKNOWLEDGED_AT,
      coolingOffAcknowledgedAt: ACKNOWLEDGED_AT,
    });
    expect(storedGift).toMatchObject({ id: giftId, status: "redeemed" });
    expect(mockGiftOpened).toHaveBeenCalledOnce();
    expect(mockCustomerConfirmation).toHaveBeenCalledTimes(2);
    expect(await submissionEmailsFired(submissionId)).toEqual(["gift_recipient_confirmation"]);
    expect(await giftEmailsFired(giftId)).toEqual(["gift_opened"]);
  });
});

describe("redeemGiftSubmission with a client whose exec always reports rowsWritten 2", () => {
  beforeEach(() => {
    __registerSqliteFactory(sqliteClientReportingTwoRowsWritten);
  });

  afterEach(() => {
    __registerSqliteFactory(() => createSqliteClient());
  });

  it(HAPPY_PATH, expectOnePaidSubmissionInTheRedeemBatch);

  it(PARALLEL_RACE, expectOneOfTwoParallelRedeemsToWin);
});
