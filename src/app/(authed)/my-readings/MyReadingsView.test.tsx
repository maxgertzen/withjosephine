import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { MY_GIFTS_PAGE_DEFAULTS, MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";

import { MyReadingsView, type MyReadingsViewProps } from "./MyReadingsView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const READINGS_COPY = MY_READINGS_PAGE_DEFAULTS;
const GIFTS_COPY = MY_GIFTS_PAGE_DEFAULTS;

function withState(state: MyReadingsViewProps["state"]) {
  return render(
    <MyReadingsView readingsCopy={READINGS_COPY} giftsCopy={GIFTS_COPY} state={state} />,
  );
}

describe("MyReadingsView", () => {
  // Pin the wall clock so the test fixtures' deliveredAt values (March / April
  // 2026) stay inside the 90-day reading-access TTL. Without this the test
  // expecting 2 unexpired reading cards starts failing the moment real time
  // crosses ~June 6 2026 and sub_1's March-08 deliveredAt ages past the TTL.
  beforeAll(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-04-15T00:00:00Z"));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it("renders the sign-in card from copy props (State 3)", () => {
    const { getByRole, getByText } = withState({ kind: "signIn" });
    expect(getByRole("heading", { name: READINGS_COPY.signInHeading })).toBeTruthy();
    expect(getByText(READINGS_COPY.signInBody)).toBeTruthy();
    const button = getByRole("button", { name: READINGS_COPY.signInButtonLabel });
    const form = button.closest("form");
    expect(form?.getAttribute("action")).toBe("/api/auth/magic-link");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(getByText(READINGS_COPY.signInFootnote)).toBeTruthy();
  });

  it("sign-in form input is type=email and required (validation lives in MagicLinkEmailForm)", () => {
    const { container } = withState({ kind: "signIn" });
    const input = container.querySelector('input[name="email"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe("email");
    expect(input.required).toBe(true);
  });

  it("renders State 4 check-your-email card", () => {
    const { getByRole, getByText } = withState({ kind: "checkEmail" });
    expect(getByRole("heading", { name: READINGS_COPY.checkEmailHeading })).toBeTruthy();
    expect(getByText(READINGS_COPY.checkEmailBody)).toBeTruthy();
    expect(
      getByRole("link", { name: READINGS_COPY.checkEmailResendLabel }).getAttribute("href"),
    ).toBe("/my-readings");
  });

  it("renders both stacked sections with mine + for-others headings when authenticated", () => {
    const { getByRole } = withState({ kind: "list", readings: [], gifts: [] });
    expect(getByRole("heading", { name: READINGS_COPY.readingsTabLabel })).toBeTruthy();
    expect(getByRole("heading", { name: READINGS_COPY.giftsTabLabel })).toBeTruthy();
  });

  it("renders readings empty state when authenticated with zero readings", () => {
    const { getByText, getByRole } = withState({ kind: "list", readings: [], gifts: [] });
    expect(getByText(READINGS_COPY.emptyHeading)).toBeTruthy();
    expect(getByRole("link", { name: READINGS_COPY.emptyCtaLabel }).getAttribute("href")).toBe(
      "/book",
    );
  });

  it("renders gifts empty state when authenticated with zero gifts", () => {
    const { getByRole } = withState({ kind: "list", readings: [], gifts: [] });
    expect(getByRole("heading", { name: GIFTS_COPY.emptyHeading })).toBeTruthy();
    expect(getByRole("link", { name: GIFTS_COPY.emptyCtaLabel }).getAttribute("href")).toBe(
      "/#readings",
    );
  });

  it("renders one card per submission with /listen/[id] link", () => {
    const { getAllByRole } = withState({
      kind: "list",
      readings: [
        {
          _id: "sub_2",
          status: "paid",
          email: "ada@example.com",
          responses: [],
          createdAt: "2026-04-01T00:00:00Z",
          deliveredAt: "2026-04-08T00:00:00Z",
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
        },
        {
          _id: "sub_1",
          status: "paid",
          email: "ada@example.com",
          responses: [],
          createdAt: "2026-03-01T00:00:00Z",
          deliveredAt: "2026-03-08T00:00:00Z",
          reading: { slug: "birth-chart", name: "Birth Chart Reading", priceDisplay: "$99" },
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
        },
      ],
      gifts: [],
    });
    const cards = getAllByRole("link", { name: READINGS_COPY.openButtonLabel });
    expect(cards).toHaveLength(2);
    expect(cards[0]?.getAttribute("href")).toBe("/listen/sub_2");
    expect(cards[1]?.getAttribute("href")).toBe("/listen/sub_1");
  });

  it("uses Sanity-supplied copy when provided", () => {
    const customCopy = { ...READINGS_COPY, signInHeading: "We've been waiting" };
    const { getByRole } = render(
      <MyReadingsView
        readingsCopy={customCopy}
        giftsCopy={GIFTS_COPY}
        state={{ kind: "signIn" }}
      />,
    );
    expect(getByRole("heading", { name: "We've been waiting" })).toBeTruthy();
  });
});
