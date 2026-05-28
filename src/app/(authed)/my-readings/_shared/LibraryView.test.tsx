import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MY_GIFTS_PAGE_DEFAULTS, MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";
import type { SubmissionRecord } from "@/lib/page-previews/types";

import { LibraryView, type LibraryViewState } from "./LibraryView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

const BASE: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "ada@example.com",
  responses: [],
  createdAt: "2026-04-22T12:00:00Z",
  paidAt: "2026-04-22T12:00:00Z",
  deliveredAt: "2026-04-29T12:00:00Z",
  voiceNoteUrl: undefined,
  pdfUrl: undefined,
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: "user_1",
  isGift: false,
  purchaserUserId: null,
  purchaserTimeZone: null,
  recipientEmail: null,
  giftDeliveryMethod: null,
  giftSendAt: null,
  giftMessage: null,
  giftClaimTokenHash: null,
  giftClaimEmailFiredAt: null,
  giftClaimedAt: null,
  giftCancelledAt: null,
  giftClaimSentNowAt: null,
  giftClaimSentNowActor: null,
  giftClaimPriorAlarmAt: null,
} as SubmissionRecord;

function makeGift(id: string): SubmissionRecord {
  return {
    ...BASE,
    _id: id,
    isGift: true,
    recipientEmail: "river@example.com",
    giftDeliveryMethod: "scheduled",
    giftSendAt: "2026-12-12T17:00:00.000Z",
    deliveredAt: undefined,
    responses: [
      { fieldKey: "recipientFirstName", fieldLabelSnapshot: "Recipient", fieldType: "string", value: "River" },
    ],
  } as SubmissionRecord;
}

function renderList(state: Extract<LibraryViewState, { kind: "list" }>) {
  return render(
    <LibraryView
      state={state}
      readingsCopy={MY_READINGS_PAGE_DEFAULTS}
      giftsCopy={MY_GIFTS_PAGE_DEFAULTS}
    />,
  );
}

describe("LibraryView — stacked sections", () => {
  it("renders both section headings for a gift-only account", () => {
    renderList({ kind: "list", readings: [], gifts: [makeGift("g1")] });
    expect(
      screen.getByRole("heading", { name: MY_READINGS_PAGE_DEFAULTS.readingsTabLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: MY_READINGS_PAGE_DEFAULTS.giftsTabLabel }),
    ).toBeInTheDocument();
  });

  it("renders both section headings for a readings-only account", () => {
    renderList({ kind: "list", readings: [BASE], gifts: [] });
    expect(
      screen.getByRole("heading", { name: MY_READINGS_PAGE_DEFAULTS.readingsTabLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: MY_READINGS_PAGE_DEFAULTS.giftsTabLabel }),
    ).toBeInTheDocument();
  });

  it("shows the readings empty-state CTA when the user has no readings", () => {
    renderList({ kind: "list", readings: [], gifts: [makeGift("g1")] });
    expect(screen.getByText(MY_READINGS_PAGE_DEFAULTS.emptyCtaLabel)).toBeInTheDocument();
  });

  it("shows the gifts empty-state CTA when the user has sent no gifts", () => {
    renderList({ kind: "list", readings: [BASE], gifts: [] });
    expect(screen.getByText(MY_GIFTS_PAGE_DEFAULTS.emptyCtaLabel)).toBeInTheDocument();
  });

  it("renders the reading open button when readings are present", () => {
    renderList({ kind: "list", readings: [BASE], gifts: [] });
    expect(screen.getByText(MY_READINGS_PAGE_DEFAULTS.openButtonLabel)).toBeInTheDocument();
  });

  it("renders both headings and both empty-state CTAs when the account is entirely empty", () => {
    renderList({ kind: "list", readings: [], gifts: [] });
    expect(
      screen.getByRole("heading", { name: MY_READINGS_PAGE_DEFAULTS.readingsTabLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: MY_READINGS_PAGE_DEFAULTS.giftsTabLabel }),
    ).toBeInTheDocument();
    expect(screen.getByText(MY_READINGS_PAGE_DEFAULTS.emptyCtaLabel)).toBeInTheDocument();
    expect(screen.getByText(MY_GIFTS_PAGE_DEFAULTS.emptyCtaLabel)).toBeInTheDocument();
  });
});
