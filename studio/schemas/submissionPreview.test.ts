import { describe, expect, it } from "vitest";

import { prepareSubmissionPreview } from "./submissionPreview";

describe("prepareSubmissionPreview", () => {
  it("formats createdAt into the title in human-readable form", () => {
    const result = prepareSubmissionPreview({
      email: "client@example.com",
      status: "pending",
      createdAt: "2026-04-30T08:11:14.346Z",
      paidAt: undefined,
    });
    expect(result.title).toContain("client@example.com");
    expect(result.title).toMatch(/30 Apr 2026/);
    expect(result.subtitle).toBe("pending");
  });

  it("appends a paid-on date to the subtitle when paidAt is set", () => {
    const result = prepareSubmissionPreview({
      email: "client@example.com",
      status: "paid",
      createdAt: "2026-05-01T08:26:26.790Z",
      paidAt: "2026-05-01T08:26:53.000Z",
    });
    expect(result.subtitle).toMatch(/paid 1 May 2026/);
  });

  it("falls back gracefully when fields are missing", () => {
    const result = prepareSubmissionPreview({});
    expect(result.title).toBe("no date — no email");
    expect(result.subtitle).toBe("pending");
  });

  it("ignores malformed createdAt rather than rendering 'Invalid Date'", () => {
    const result = prepareSubmissionPreview({
      email: "client@example.com",
      status: "paid",
      createdAt: "not-a-date",
    });
    expect(result.title).toBe("no date — client@example.com");
  });
});
