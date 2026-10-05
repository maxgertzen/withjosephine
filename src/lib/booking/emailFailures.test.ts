import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/cloudflare", () => ({ captureMessage: vi.fn() }));

vi.mock("./persistence/repository", () => ({
  appendEmailFailure: vi.fn(),
}));

vi.mock("./persistence/sanityMirror", () => ({
  mirrorSubmissionPatch: vi.fn(async () => undefined),
}));

import * as Sentry from "@sentry/cloudflare";

import {
  failureFromError,
  failureFromUnsentResult,
  hasOpenUndeliveredFailure,
  recordEmailFailure,
  scrubEmailAddresses,
} from "./emailFailures";
import * as repo from "./persistence/repository";
import { mirrorSubmissionPatch } from "./persistence/sanityMirror";
import type { EmailFailureEntry } from "./submissions";

const mockAppend = vi.mocked(repo.appendEmailFailure);
const mockMirror = vi.mocked(mirrorSubmissionPatch);
const mockCapture = vi.mocked(Sentry.captureMessage);

const NOW = "2026-10-04T12:00:00.000Z";

const FIELDS = {
  emailType: "order_confirmation",
  kind: "bounced",
  recipient: "ada@example.com",
  bounceType: "Permanent / General",
} as const;

const STORED: EmailFailureEntry = {
  ...FIELDS,
  attemptNumber: 1,
  attemptedAt: null,
  failedAt: NOW,
  statusCode: null,
  errorCode: null,
  errorMessage: null,
  resendId: null,
  resolvedAt: null,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockAppend.mockReset().mockResolvedValue([STORED]);
  mockMirror.mockClear();
  mockCapture.mockClear();
});

describe("recordEmailFailure", () => {
  it("fills the defaults, stores the failure and mirrors the full list", async () => {
    await recordEmailFailure("sub_1", FIELDS);

    expect(mockAppend).toHaveBeenCalledWith("sub_1", {
      ...FIELDS,
      attemptedAt: null,
      failedAt: NOW,
      statusCode: null,
      errorCode: null,
      errorMessage: null,
      resendId: null,
    });
    expect(mockMirror).toHaveBeenCalledWith("sub_1", { emailFailures: [STORED] });
  });

  it("reports to Sentry without the address", async () => {
    await recordEmailFailure("sub_1", FIELDS);

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mockCapture.mock.calls[0])).not.toContain("ada@example.com");
    expect(mockCapture.mock.calls[0]?.[1]).toMatchObject({
      level: "error",
      tags: { submission_id: "sub_1", email_type: "order_confirmation", failure_kind: "bounced" },
    });
  });

  it("reports to Sentry and mirrors nothing when the submission row is gone", async () => {
    mockAppend.mockResolvedValueOnce(null);

    await recordEmailFailure("sub_missing", FIELDS);

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockMirror).not.toHaveBeenCalled();
  });

  it("does not throw when storing the failure fails", async () => {
    mockAppend.mockRejectedValueOnce(new Error("D1 down"));

    await expect(recordEmailFailure("sub_1", FIELDS)).resolves.toBeUndefined();
    expect(mockCapture).toHaveBeenCalledTimes(1);
  });
});

describe("failure details", () => {
  it("marks a 409 invalid_idempotent_request as maybe_sent", () => {
    expect(
      failureFromUnsentResult({ kind: "failed", error: "invalid_idempotent_request", statusCode: 409 }),
    ).toEqual({
      kind: "maybe_sent",
      statusCode: 409,
      errorCode: "invalid_idempotent_request",
      errorMessage: null,
    });
  });

  it("keeps the skip reason of a send that never reached Resend", () => {
    expect(failureFromUnsentResult({ kind: "skipped", reason: "no_api_key" })).toMatchObject({
      kind: "refused",
      errorCode: "no_api_key",
    });
  });

  it("keeps the message of a thrown error", () => {
    expect(failureFromError(new Error("boom"))).toMatchObject({ errorMessage: "boom" });
  });

  it("finds only unresolved bounces and suppressions of the asked type", () => {
    expect(hasOpenUndeliveredFailure([STORED], "order_confirmation")).toBe(true);
    expect(hasOpenUndeliveredFailure([STORED], "reading_delivery")).toBe(false);
    expect(hasOpenUndeliveredFailure([{ ...STORED, resolvedAt: NOW }], "order_confirmation")).toBe(
      false,
    );
    expect(
      hasOpenUndeliveredFailure([{ ...STORED, kind: "refused" }, { ...STORED, kind: "send_error" }], "order_confirmation"),
    ).toBe(false);
  });
});

describe("scrubEmailAddresses", () => {
  it("replaces every email address in a provider message", () => {
    expect(
      scrubEmailAddresses("550 5.1.1 <anna.b+gift@example.co.uk>: user unknown, cc dana@example.com"),
    ).toBe("550 5.1.1 <[address]>: user unknown, cc [address]");
  });

  it("keeps a message without addresses and turns nothing into null", () => {
    expect(scrubEmailAddresses("Mailbox does not exist")).toBe("Mailbox does not exist");
    expect(scrubEmailAddresses(null)).toBeNull();
    expect(scrubEmailAddresses("")).toBeNull();
  });
});
