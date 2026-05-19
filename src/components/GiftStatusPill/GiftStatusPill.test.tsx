import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MY_GIFTS_PAGE_DEFAULTS } from "@/data/defaults";
import { GIFT_STATUS_KIND } from "@/lib/booking/constants";
import type { GiftStatus } from "@/lib/booking/giftStatus";

import { GiftStatusPill } from "./GiftStatusPill";

const COPY = MY_GIFTS_PAGE_DEFAULTS;

const SAMPLE_DATE = "2026-06-15T14:30:00.000Z";

const FIXTURES: Array<{ status: GiftStatus; expectedSubstring: string }> = [
  {
    status: { kind: GIFT_STATUS_KIND.scheduled, sendAt: SAMPLE_DATE },
    expectedSubstring: COPY.statusScheduledLabel,
  },
  {
    status: { kind: GIFT_STATUS_KIND.selfSendReady, firedAt: null },
    expectedSubstring: COPY.statusSelfSendReadyLabel,
  },
  {
    status: { kind: GIFT_STATUS_KIND.sentWaitingRecipient, firedAt: SAMPLE_DATE },
    expectedSubstring: COPY.statusSentLabel,
  },
  {
    status: { kind: GIFT_STATUS_KIND.recipientPreparing, claimedAt: SAMPLE_DATE },
    expectedSubstring: COPY.statusPreparingLabel,
  },
  {
    status: { kind: GIFT_STATUS_KIND.delivered, deliveredAt: SAMPLE_DATE },
    expectedSubstring: COPY.statusDeliveredLabel,
  },
  {
    status: { kind: GIFT_STATUS_KIND.cancelled, cancelledAt: SAMPLE_DATE },
    expectedSubstring: COPY.statusCancelledLabel,
  },
];

describe("GiftStatusPill", () => {
  for (const { status, expectedSubstring } of FIXTURES) {
    it(`renders the ${status.kind} status with its label`, () => {
      render(<GiftStatusPill status={status} copy={COPY} />);
      const pill = screen.getByRole("status");
      expect(pill.textContent).toContain(expectedSubstring);
      expect(pill.getAttribute("data-status")).toBe(status.kind);
    });
  }

  it("includes the formatted send date inside the scheduled label", () => {
    render(
      <GiftStatusPill
        status={{ kind: GIFT_STATUS_KIND.scheduled, sendAt: SAMPLE_DATE }}
        copy={COPY}
      />,
    );
    const pill = screen.getByRole("status");
    expect(pill.textContent).toMatch(/June 15, 2026 at/);
  });

  it("includes the formatted delivery date inside the delivered label", () => {
    render(
      <GiftStatusPill
        status={{ kind: GIFT_STATUS_KIND.delivered, deliveredAt: SAMPLE_DATE }}
        copy={COPY}
      />,
    );
    const pill = screen.getByRole("status");
    expect(pill.textContent).toMatch(/June 15, 2026 at/);
  });

  it("exposes the full label as the accessible name via aria-label", () => {
    render(
      <GiftStatusPill
        status={{ kind: GIFT_STATUS_KIND.scheduled, sendAt: SAMPLE_DATE }}
        copy={COPY}
      />,
    );
    const pill = screen.getByRole("status");
    expect(pill.getAttribute("aria-label")).toContain(COPY.statusScheduledLabel);
  });

  it("does not leak recipient PII — only status + copy are inputs", () => {
    render(
      <GiftStatusPill
        status={{ kind: GIFT_STATUS_KIND.sentWaitingRecipient, firedAt: SAMPLE_DATE }}
        copy={COPY}
      />,
    );
    const pill = screen.getByRole("status");
    expect(pill.textContent).not.toMatch(/@/);
  });

  it("renders the contrast-bearing border class for WCAG 1.4.11", () => {
    render(
      <GiftStatusPill
        status={{ kind: GIFT_STATUS_KIND.cancelled, cancelledAt: SAMPLE_DATE }}
        copy={COPY}
      />,
    );
    const pill = screen.getByRole("status");
    expect(pill.className).toContain("border-j-status-pill-border");
  });
});
