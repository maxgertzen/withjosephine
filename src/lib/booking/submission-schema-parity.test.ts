import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { projectGiftSubmission } from "@/lib/gift/giftSubmissionMirror";
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

  it("declares the read-only gift block with the buyer's first name", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"gift",[^]*?readOnly:\s*true[^]*?name:\s*"buyerFirstName"/);
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

describe("gift submission mirror parity", () => {
  it("declares every top-level and gift block field the gift mirror writes", () => {
    const projected = projectGiftSubmission(
      makeGiftRecord({ status: "active" }),
      { _type: "reference", _ref: "reading-birth-chart" },
    );

    for (const field of Object.keys(projected!.unopened!)) {
      expect(SCHEMA_SOURCE).toMatch(new RegExp(`name:\\s*"${field}"`));
    }
    for (const field of Object.keys(projected!.gift)) {
      expect(SCHEMA_SOURCE).toMatch(new RegExp(`name:\\s*"gift",[^]*?name:\\s*"${field}"`));
    }
  });
});
