import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";

import { MyReadingsView, type MyReadingsViewProps } from "./MyReadingsView";

const COPY = MY_READINGS_PAGE_DEFAULTS;

function withState(state: MyReadingsViewProps["state"]) {
  return render(<MyReadingsView copy={COPY} state={state} />);
}

describe("MyReadingsView", () => {
  it("renders the sign-in card from copy props (State 3)", () => {
    const { getByRole, getByText } = withState({ kind: "signIn" });
    expect(getByRole("heading", { name: COPY.signInHeading })).toBeTruthy();
    expect(getByText(COPY.signInBody)).toBeTruthy();
    const button = getByRole("button", { name: COPY.signInButtonLabel });
    const form = button.closest("form");
    expect(form?.getAttribute("action")).toBe("/api/auth/magic-link");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(getByText(COPY.signInFootnote)).toBeTruthy();
  });

  it("sign-in form input is type=email and required (validation lives in MagicLinkEmailForm)", () => {
    const { container } = withState({ kind: "signIn" });
    const input = container.querySelector('input[name="email"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe("email");
    expect(input.required).toBe(true);
    // Disabled-until-valid + visible error feedback are exercised in
    // MagicLinkEmailForm.test.tsx — kept here is just the wiring check.
  });

  it("renders State 4 check-your-email card", () => {
    const { getByRole, getByText, getByRole: q } = withState({ kind: "checkEmail" });
    expect(getByRole("heading", { name: COPY.checkEmailHeading })).toBeTruthy();
    expect(getByText(COPY.checkEmailBody)).toBeTruthy();
    expect(q("link", { name: COPY.checkEmailResendLabel }).getAttribute("href")).toBe(
      "/my-readings",
    );
  });

  it("renders empty state when authenticated with zero readings", () => {
    const { getByRole, getByText } = withState({ kind: "list", readings: [] });
    expect(getByRole("heading", { name: COPY.listHeading })).toBeTruthy();
    expect(getByText(COPY.emptyHeading)).toBeTruthy();
    expect(getByRole("link", { name: COPY.emptyCtaLabel }).getAttribute("href")).toBe("/book");
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
          recipientEmail: null,
          giftDeliveryMethod: null,
          giftSendAt: null,
          giftMessage: null,
          giftClaimTokenHash: null,
          giftClaimEmailFiredAt: null,
          giftClaimedAt: null,
          giftCancelledAt: null,
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
          recipientEmail: null,
          giftDeliveryMethod: null,
          giftSendAt: null,
          giftMessage: null,
          giftClaimTokenHash: null,
          giftClaimEmailFiredAt: null,
          giftClaimedAt: null,
          giftCancelledAt: null,
        },
      ],
    });
    const cards = getAllByRole("link", { name: COPY.openButtonLabel });
    expect(cards).toHaveLength(2);
    expect(cards[0]?.getAttribute("href")).toBe("/listen/sub_2");
    expect(cards[1]?.getAttribute("href")).toBe("/listen/sub_1");
  });

  it("uses Sanity-supplied copy when provided", () => {
    const customCopy = { ...COPY, signInHeading: "We've been waiting" };
    const { getByRole } = render(
      <MyReadingsView copy={customCopy} state={{ kind: "signIn" }} />,
    );
    expect(getByRole("heading", { name: "We've been waiting" })).toBeTruthy();
  });
});
