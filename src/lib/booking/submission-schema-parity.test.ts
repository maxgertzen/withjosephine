import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { EmailFiredType } from "./submissions";

const EXPECTED_EMAIL_FIRED_TYPES: EmailFiredType[] = [
  "order_confirmation",
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

  it("declares deliveredAt read-only so only the send writes it", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"deliveredAt",[^}]*readOnly:\s*true/);
  });

  it("consentSnapshot schema declares coolingOffConsent", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"coolingOffConsent"/);
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"art6Consent"/);
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"art9Consent"/);
  });
});
