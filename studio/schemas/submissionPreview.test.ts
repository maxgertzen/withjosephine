import { describe, expect, it } from "vitest";

import { buildPreview, prepareSubmissionPreview } from "./submissionPreview";

const NAME_RESPONSES = [
  { fieldKey: "first_name", fieldType: "shortText", value: "Marie" },
  { fieldKey: "last_name", fieldType: "shortText", value: "Dupont" },
];

const NAME_FIELDS = { responses: NAME_RESPONSES };

describe("prepareSubmissionPreview — title", () => {
  it("renders full name when both first_name and last_name responses are present", () => {
    const result = prepareSubmissionPreview({
      ...NAME_FIELDS,
      email: "marie@example.com",
      status: "pending",
      createdAt: "2026-05-08T10:00:00.000Z",
    });
    expect(result.title).toBe("Marie Dupont");
  });

  it("falls back to email when last_name response is missing (first alone is not a full name)", () => {
    const result = prepareSubmissionPreview({
      responses: [NAME_RESPONSES[0]],
      email: "marie@example.com",
      status: "pending",
    });
    expect(result.title).toBe("marie@example.com");
  });

  it("falls back to email when first_name response is missing", () => {
    const result = prepareSubmissionPreview({
      responses: [NAME_RESPONSES[1]],
      email: "dupont@example.com",
      status: "pending",
    });
    expect(result.title).toBe("dupont@example.com");
  });

  it("falls back to email when no name responses present", () => {
    const result = prepareSubmissionPreview({
      responses: [],
      email: "alice@example.com",
      status: "pending",
    });
    expect(result.title).toBe("alice@example.com");
  });

  it('falls back to "no name" when responses and email are both missing', () => {
    const result = prepareSubmissionPreview({ responses: [], status: "pending" });
    expect(result.title).toBe("no name");
  });

  it("ignores response values that are empty or whitespace-only", () => {
    const result = prepareSubmissionPreview({
      responses: [
        { fieldKey: "first_name", value: "   " },
        { fieldKey: "last_name", value: "" },
      ],
      email: "alice@example.com",
      status: "pending",
    });
    expect(result.title).toBe("alice@example.com");
  });
});

describe("prepareSubmissionPreview — subtitle order (email first, dates second when name is the title)", () => {
  it("pending: renders email · Submitted ${date}", () => {
    const result = prepareSubmissionPreview({
      ...NAME_FIELDS,
      email: "alice@example.com",
      status: "pending",
      createdAt: "2026-05-08T10:00:00.000Z",
    });
    expect(result.subtitle).toBe("alice@example.com · Submitted 8 May 2026");
  });

  it("paid (Day 4 of 7): renders email · Paid ${date} · Day 4 of 7", () => {
    const result = buildPreview(
      {
        ...NAME_FIELDS,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-03T12:00:00.000Z",
      },
      new Date("2026-05-06T12:00:00.000Z"),
    );
    expect(result.subtitle).toBe("alice@example.com · Paid 3 May 2026 · Day 4 of 7");
  });

  it("paid (Day 1 boundary): renders Day 1 of 7 on the day of payment", () => {
    const result = buildPreview(
      {
        ...NAME_FIELDS,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-03T12:00:00.000Z",
      },
      new Date("2026-05-03T12:00:00.001Z"),
    );
    expect(result.subtitle).toMatch(/Day 1 of 7/);
  });

  it("paid (Day 7 boundary): renders Day 7 of 7 on the last day of the window", () => {
    const result = buildPreview(
      {
        ...NAME_FIELDS,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-03T12:00:00.000Z",
      },
      new Date("2026-05-09T12:00:00.000Z"),
    );
    expect(result.subtitle).toMatch(/Day 7 of 7/);
  });

  it("paid (overdue): renders Day 8 — overdue once the 7-day window closes", () => {
    const result = buildPreview(
      {
        ...NAME_FIELDS,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-03T12:00:00.000Z",
      },
      new Date("2026-05-10T12:00:00.000Z"),
    );
    expect(result.subtitle).toMatch(/Day 8 — overdue/);
  });

  it("paid with clock-skew (paidAt in future): clamps to Day 1, not Day -N", () => {
    const result = buildPreview(
      {
        ...NAME_FIELDS,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-10T12:00:00.000Z",
      },
      new Date("2026-05-08T12:00:00.000Z"),
    );
    expect(result.subtitle).toMatch(/Day 1 of 7/);
  });

  it("delivered, not listened: renders email · Delivered ${date}", () => {
    const result = prepareSubmissionPreview({
      ...NAME_FIELDS,
      email: "alice@example.com",
      status: "paid",
      paidAt: "2026-05-03T12:00:00.000Z",
      deliveredAt: "2026-05-06T12:00:00.000Z",
    });
    expect(result.subtitle).toBe("alice@example.com · Delivered 6 May 2026");
  });

  it("delivered AND listened: renders email · Delivered ${date} · Listened ${date}", () => {
    const result = prepareSubmissionPreview({
      ...NAME_FIELDS,
      email: "alice@example.com",
      status: "paid",
      paidAt: "2026-05-03T12:00:00.000Z",
      deliveredAt: "2026-05-06T12:00:00.000Z",
      listenedAt: "2026-05-06T14:00:00.000Z",
    });
    expect(result.subtitle).toBe(
      "alice@example.com · Delivered 6 May 2026 · Listened 6 May 2026",
    );
  });

  it("paid status with missing paidAt: falls back to Submitted ${createdAt}", () => {
    const result = prepareSubmissionPreview({
      ...NAME_FIELDS,
      email: "alice@example.com",
      status: "paid",
      createdAt: "2026-05-01T12:00:00.000Z",
    });
    expect(result.subtitle).toMatch(/^alice@example\.com · Submitted 1 May 2026/);
  });

  it("expired status: falls back to status only after email", () => {
    const result = prepareSubmissionPreview({
      ...NAME_FIELDS,
      email: "alice@example.com",
      status: "expired",
    });
    expect(result.subtitle).toBe("alice@example.com · expired");
  });

  it("ignores malformed paidAt rather than rendering 'Invalid Date'", () => {
    const result = prepareSubmissionPreview({
      ...NAME_FIELDS,
      email: "alice@example.com",
      status: "paid",
      paidAt: "not-a-date",
    });
    expect(result.subtitle).not.toMatch(/Invalid Date/);
  });
});

describe("prepareSubmissionPreview — subtitle when title falls back to email (no duplication)", () => {
  it("pending without name: subtitle has dates only, no email", () => {
    const result = prepareSubmissionPreview({
      responses: [],
      email: "alice@example.com",
      status: "pending",
      createdAt: "2026-05-08T10:00:00.000Z",
    });
    expect(result.title).toBe("alice@example.com");
    expect(result.subtitle).toBe("Submitted 8 May 2026");
  });

  it("paid without name: subtitle has paid date + day counter only, no email", () => {
    const result = buildPreview(
      {
        responses: [],
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-03T12:00:00.000Z",
      },
      new Date("2026-05-06T12:00:00.000Z"),
    );
    expect(result.title).toBe("alice@example.com");
    expect(result.subtitle).toBe("Paid 3 May 2026 · Day 4 of 7");
  });

  it("delivered without name: subtitle has delivery date only, no email", () => {
    const result = prepareSubmissionPreview({
      responses: [],
      email: "alice@example.com",
      status: "paid",
      deliveredAt: "2026-05-06T12:00:00.000Z",
    });
    expect(result.title).toBe("alice@example.com");
    expect(result.subtitle).toBe("Delivered 6 May 2026");
  });

  it("no name and no email: title 'no name', subtitle still has dates", () => {
    const result = prepareSubmissionPreview({
      responses: [],
      status: "pending",
      createdAt: "2026-05-08T10:00:00.000Z",
    });
    expect(result.title).toBe("no name");
    expect(result.subtitle).toBe("Submitted 8 May 2026");
  });
});
