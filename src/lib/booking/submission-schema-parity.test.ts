import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { projectGiftRecord } from "@/lib/gift/giftRecordMirror";
import { makeGiftRecord } from "@/test/fixtures/gift";

import type { EmailFiredType } from "./submissions";

const EXPECTED_EMAIL_FIRED_TYPES: EmailFiredType[] = [
  "order_confirmation",
  "gift_recipient_confirmation",
  "reading_delivery",
  "reading_overdue_alert",
  "day14",
  "abandonment",
];

const SCHEMA_SOURCE = readFileSync(
  resolve(__dirname, "../../../studio/schemas/submission.ts"),
  "utf-8",
);

describe("submission schema parity", () => {
  it("emailsFired.type enum covers every EmailFiredType value", () => {
    for (const value of EXPECTED_EMAIL_FIRED_TYPES) {
      expect(SCHEMA_SOURCE).toContain(`value: "${value}"`);
    }
  });

  it("declares the Send reading now request and failure fields", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"deliveryRequestedAt"/);
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"deliveryFailedAt"/);
  });

  it("declares the resend request and the read-only failed sends list", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"emailResendRequest",[^]*?hidden:\s*true/);
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"emailFailures",[^]*?readOnly:\s*true/);
  });

  it("declares email read-only so a correction goes through the resend action", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"email",\s*title:\s*"Email",\s*type:\s*"string",\s*readOnly:\s*true/);
  });

  it("declares status, intake answers, payment and consent read-only, written by the site only", () => {
    for (const field of ["status", "responses", "photoR2Key", "paidAt", "amountPaidCents", "consentSnapshot", "emailsFired"]) {
      expect(SCHEMA_SOURCE).toMatch(new RegExp(`name:\\s*"${field}",[^}]*?readOnly:\\s*true`));
    }
  });

  it("declares the read-only gift block with the buyer's first name and a weak gift record link", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"gift",[^]*?readOnly:\s*true[^]*?name:\s*"buyerFirstName"/);
    expect(SCHEMA_SOURCE).toMatch(
      /name:\s*"gift",[^]*?name:\s*"giftRecord",[^}]*?to:\s*\[\{\s*type:\s*"giftRecord"\s*\}\],\s*weak:\s*true/,
    );
  });

  it("declares deliveredAt read-only so only the send writes it", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"deliveredAt",[^}]*readOnly:\s*true/);
  });

  it("consentSnapshot schema declares coolingOffConsent", () => {
    for (const consent of ["coolingOffConsent", "art6Consent", "art9Consent"]) {
      expect(SCHEMA_SOURCE).toMatch(new RegExp(`consentRecord\\(\\s*"${consent}"`));
    }
  });
});

const GIFT_RECORD_SCHEMA_SOURCE = readFileSync(
  resolve(__dirname, "../../../studio/schemas/giftRecord.ts"),
  "utf-8",
);

describe("giftRecord schema parity", () => {
  it("declares every field the mirror writes", () => {
    const projected = projectGiftRecord(
      makeGiftRecord({
        status: "redeemed",
        activatedAt: "2026-10-03T08:05:00.000Z",
        lastSentAt: "2026-10-03T09:00:00.000Z",
        redeemedAt: "2026-10-04T08:00:00.000Z",
        redeemedSubmissionId: "sub_1",
      }),
      { _type: "reference", _ref: "reading-birth-chart" },
    );
    const writtenFields = Object.keys(projected!).filter((key) => !key.startsWith("_"));

    for (const field of writtenFields) {
      expect(GIFT_RECORD_SCHEMA_SOURCE).toMatch(new RegExp(`name:\\s*"${field}"`));
    }
  });

  it("is read-only and links the booking weakly", () => {
    expect(GIFT_RECORD_SCHEMA_SOURCE).toMatch(/type:\s*"document",\s*readOnly:\s*true/);
    expect(GIFT_RECORD_SCHEMA_SOURCE).toMatch(
      /name:\s*"submission",[^}]*?to:\s*\[\{\s*type:\s*"submission"\s*\}\],\s*weak:\s*true/,
    );
  });
});
