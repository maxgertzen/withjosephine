import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPreview,
  giftDeliveryCountdown,
  prepareSubmissionPreview,
  statusLabel,
} from "./submissionPreview";

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

describe("giftDeliveryCountdown", () => {
  const claimedAt = "2026-05-01T12:00:00.000Z";

  it("returns null when giftClaimedAt is null", () => {
    expect(giftDeliveryCountdown(null, new Date("2026-05-03T12:00:00.000Z"))).toBeNull();
  });

  it("returns null when giftClaimedAt is undefined", () => {
    expect(giftDeliveryCountdown(undefined, new Date("2026-05-03T12:00:00.000Z"))).toBeNull();
  });

  it("returns null when giftClaimedAt is malformed", () => {
    expect(giftDeliveryCountdown("not-a-date", new Date("2026-05-03T12:00:00.000Z"))).toBeNull();
  });

  it("returns '7 days left to deliver' on day-of-claim (no elapsed)", () => {
    expect(giftDeliveryCountdown(claimedAt, new Date("2026-05-01T12:00:00.001Z"))).toBe(
      "7 days left to deliver",
    );
  });

  it("returns '5 days left to deliver' after 2 full days elapsed", () => {
    expect(giftDeliveryCountdown(claimedAt, new Date("2026-05-03T12:00:00.000Z"))).toBe(
      "5 days left to deliver",
    );
  });

  it("returns 'Due today' at exactly 7 days elapsed", () => {
    expect(giftDeliveryCountdown(claimedAt, new Date("2026-05-08T12:00:00.000Z"))).toBe(
      "Due today",
    );
  });

  it("returns 'Overdue by 2 days' when 9 days elapsed", () => {
    expect(giftDeliveryCountdown(claimedAt, new Date("2026-05-10T12:00:00.000Z"))).toBe(
      "Overdue by 2 days",
    );
  });

  it("returns 'Overdue by 1 day' (singular grammar) when exactly 8 days elapsed", () => {
    expect(giftDeliveryCountdown(claimedAt, new Date("2026-05-09T12:00:00.000Z"))).toBe(
      "Overdue by 1 day",
    );
  });

  it("returns '1 day left to deliver' (singular grammar) when 6 days elapsed", () => {
    expect(giftDeliveryCountdown(claimedAt, new Date("2026-05-07T12:00:00.000Z"))).toBe(
      "1 day left to deliver",
    );
  });

  it("clamps future giftClaimedAt to '7 days left to deliver' (no negative-N-days)", () => {
    expect(giftDeliveryCountdown(claimedAt, new Date("2026-04-28T12:00:00.000Z"))).toBe(
      "7 days left to deliver",
    );
  });

  describe("future-clamp dev warning", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it("emits console.warn in NODE_ENV=development when giftClaimedAt is future-dated", () => {
      vi.stubEnv("NODE_ENV", "development");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      giftDeliveryCountdown(claimedAt, new Date("2026-04-28T12:00:00.000Z"));
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toMatch(/giftClaimedAt is in the future/);
    });

    it("does not emit console.warn in NODE_ENV=test (silent in CI)", () => {
      vi.stubEnv("NODE_ENV", "test");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      giftDeliveryCountdown(claimedAt, new Date("2026-04-28T12:00:00.000Z"));
      expect(warn).not.toHaveBeenCalled();
    });
  });
});

describe("statusLabel", () => {
  const NOW = new Date("2026-05-06T12:00:00.000Z");

  it("returns 'Paid · awaiting claim' when gift paid but not yet claimed", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: true,
        giftClaimedAt: null,
        deliveredAt: null,
        now: NOW,
      }),
    ).toBe("Paid · awaiting claim");
  });

  it("returns 'Claimed · N days left to deliver' when gift claimed but not delivered", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: true,
        giftClaimedAt: "2026-05-04T12:00:00.000Z",
        deliveredAt: null,
        now: NOW,
      }),
    ).toBe("Claimed · 5 days left to deliver");
  });

  it("returns null once deliveredAt is set (delivered label takes over)", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: true,
        giftClaimedAt: "2026-05-04T12:00:00.000Z",
        deliveredAt: "2026-05-05T12:00:00.000Z",
        now: NOW,
      }),
    ).toBeNull();
  });

  it("returns null for non-gift paid submissions (no claim label)", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: false,
        giftClaimedAt: null,
        deliveredAt: null,
        now: NOW,
      }),
    ).toBeNull();
  });

  it("returns null for pending status (no claim label)", () => {
    expect(
      statusLabel({
        status: "pending",
        isGift: true,
        giftClaimedAt: null,
        deliveredAt: null,
        now: NOW,
      }),
    ).toBeNull();
  });

  it("returns 'Claimed · Due today' on day-7 boundary", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: true,
        giftClaimedAt: "2026-04-29T12:00:00.000Z",
        deliveredAt: null,
        now: NOW,
      }),
    ).toBe("Claimed · Due today");
  });

  it("returns 'Claimed · Overdue by 1 day' (singular) at exactly 1 day past window", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: true,
        giftClaimedAt: "2026-04-28T12:00:00.000Z",
        deliveredAt: null,
        now: NOW,
      }),
    ).toBe("Claimed · Overdue by 1 day");
  });

  it("returns 'Claimed · Overdue by 2 days' (plural) at 2 days past window", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: true,
        giftClaimedAt: "2026-04-27T12:00:00.000Z",
        deliveredAt: null,
        now: NOW,
      }),
    ).toBe("Claimed · Overdue by 2 days");
  });

  it("returns 'Claimed · 1 day left to deliver' (singular) at exactly 1 day remaining", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: true,
        giftClaimedAt: "2026-04-30T12:00:00.000Z",
        deliveredAt: null,
        now: NOW,
      }),
    ).toBe("Claimed · 1 day left to deliver");
  });

  it("falls back to 'Paid · awaiting claim' when isGift+paid but giftClaimedAt is a malformed date string", () => {
    expect(
      statusLabel({
        status: "paid",
        isGift: true,
        giftClaimedAt: "invalid-date-string",
        deliveredAt: null,
        now: NOW,
      }),
    ).toBe("Paid · awaiting claim");
  });
});

describe("buildPreview — gift claim status integration", () => {
  it("subtitle includes claim label when isGift+giftClaimedAt set", () => {
    const result = buildPreview(
      {
        responses: NAME_RESPONSES,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-01T12:00:00.000Z",
        isGift: true,
        giftClaimedAt: "2026-05-03T12:00:00.000Z",
      },
      new Date("2026-05-05T12:00:00.000Z"),
    );
    expect(result.subtitle).toContain("Claimed · 5 days left to deliver");
  });

  it("subtitle includes 'Paid · awaiting claim' for unclaimed gifts", () => {
    const result = buildPreview(
      {
        responses: NAME_RESPONSES,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-01T12:00:00.000Z",
        isGift: true,
        giftClaimedAt: null,
      },
      new Date("2026-05-02T12:00:00.000Z"),
    );
    expect(result.subtitle).toContain("Paid · awaiting claim");
  });

  it("subtitle preserves email-first ordering when name is the title", () => {
    const result = buildPreview(
      {
        responses: NAME_RESPONSES,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-01T12:00:00.000Z",
        isGift: true,
        giftClaimedAt: "2026-05-03T12:00:00.000Z",
      },
      new Date("2026-05-05T12:00:00.000Z"),
    );
    expect(result.title).toBe("Marie Dupont");
    expect(result.subtitle.startsWith("alice@example.com")).toBe(true);
  });

  it("non-gift paid submissions render unchanged (no claim label)", () => {
    const result = buildPreview(
      {
        responses: NAME_RESPONSES,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-03T12:00:00.000Z",
        isGift: false,
      },
      new Date("2026-05-06T12:00:00.000Z"),
    );
    expect(result.subtitle).toBe("alice@example.com · Paid 3 May 2026 · Day 4 of 7");
  });

  it("delivered gifts render delivered label, not claim countdown", () => {
    const result = buildPreview(
      {
        responses: NAME_RESPONSES,
        email: "alice@example.com",
        status: "paid",
        paidAt: "2026-05-01T12:00:00.000Z",
        isGift: true,
        giftClaimedAt: "2026-05-02T12:00:00.000Z",
        deliveredAt: "2026-05-06T12:00:00.000Z",
      },
      new Date("2026-05-07T12:00:00.000Z"),
    );
    expect(result.subtitle).toBe("alice@example.com · Delivered 6 May 2026");
  });
});

describe("buildPreview — gift purchaser vs recipient labeling (6wdpf3x0)", () => {
  it("labels purchaser and recipient when a claimed gift carries a recipientEmail", () => {
    const result = buildPreview(
      {
        responses: NAME_RESPONSES,
        email: "buyer@example.com",
        recipientEmail: "recipient@example.com",
        status: "paid",
        paidAt: "2026-05-01T12:00:00.000Z",
        isGift: true,
        giftClaimedAt: "2026-05-03T12:00:00.000Z",
      },
      new Date("2026-05-05T12:00:00.000Z"),
    );
    expect(result.subtitle).toContain("Purchaser buyer@example.com · Recipient recipient@example.com");
  });

  it("uses the recipient label as the title when there is no name yet", () => {
    const result = buildPreview(
      {
        responses: [],
        email: "buyer@example.com",
        recipientEmail: "recipient@example.com",
        status: "paid",
        paidAt: "2026-05-01T12:00:00.000Z",
        isGift: true,
      },
      new Date("2026-05-02T12:00:00.000Z"),
    );
    expect(result.title).toBe("Purchaser buyer@example.com · Recipient recipient@example.com");
  });

  it("keeps the bare purchaser email for an unclaimed gift (no recipientEmail yet)", () => {
    const result = buildPreview(
      {
        responses: [],
        email: "buyer@example.com",
        status: "paid",
        paidAt: "2026-05-01T12:00:00.000Z",
        isGift: true,
      },
      new Date("2026-05-02T12:00:00.000Z"),
    );
    expect(result.title).toBe("buyer@example.com");
  });

  it("does not label a non-gift submission even if recipientEmail leaks in", () => {
    const result = buildPreview(
      {
        responses: [],
        email: "buyer@example.com",
        recipientEmail: "recipient@example.com",
        status: "paid",
        paidAt: "2026-05-03T12:00:00.000Z",
        isGift: false,
      },
      new Date("2026-05-06T12:00:00.000Z"),
    );
    expect(result.title).toBe("buyer@example.com");
    expect(result.subtitle).not.toContain("Recipient");
  });
});
