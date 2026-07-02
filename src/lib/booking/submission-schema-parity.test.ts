import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { EmailFiredType } from "./submissions";

const EXPECTED_EMAIL_FIRED_TYPES: EmailFiredType[] = [
  "order_confirmation",
  "day7",
  "day7-overdue-alert",
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

  it("consentSnapshot schema declares coolingOffConsent", () => {
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"coolingOffConsent"/);
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"art6Consent"/);
    expect(SCHEMA_SOURCE).toMatch(/name:\s*"art9Consent"/);
  });
});
