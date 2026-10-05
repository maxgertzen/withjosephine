import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  identifySubmission: vi.fn(),
}));

import { GIFT_DEFAULTS } from "@/data/defaults";
import { pick } from "@/lib/pick";

import { GiftFold, type GiftFoldProps } from "./GiftFold";
import { GIFT_FOLD_COPY_KEYS } from "./giftFoldCopy";

const READING = { slug: "birth-chart", name: "Birth Chart Reading", price: "$89" };
const GIFT_SHEET_NAME = `${READING.name} · ${READING.price}`;

function renderFold(overrides: Partial<GiftFoldProps> = {}) {
  const user = userEvent.setup();
  render(
    <GiftFold
      readingSlug={READING.slug}
      copy={pick(GIFT_DEFAULTS, GIFT_FOLD_COPY_KEYS)}
      giftSheet={{ reading: READING, content: GIFT_DEFAULTS, endpoint: null }}
      redeemSheet={{ readingSlug: READING.slug, content: GIFT_DEFAULTS, endpoint: null }}
      {...overrides}
    />,
  );
  return user;
}

function row() {
  return screen.getByRole("button", { name: GIFT_DEFAULTS.giftRowLabel });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GiftFold", () => {
  it("starts closed with the panel inert", () => {
    renderFold();

    expect(row()).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(row().getAttribute("aria-controls") ?? "")).toHaveAttribute(
      "inert",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens to the buy line and the redeem line", async () => {
    const user = renderFold();

    await user.click(row());

    expect(row()).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: GIFT_DEFAULTS.giftRowLabel });
    expect(panel).not.toHaveAttribute("inert");
    expect(screen.getByText(GIFT_DEFAULTS.buyLead)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.buyLinkLabel })).toBeInTheDocument();
    expect(screen.getByText(GIFT_DEFAULTS.redeemLead)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.redeemLinkLabel })).toBeInTheDocument();
  });

  it("opens the gift sheet from Send it as a gift and returns focus on close", async () => {
    const user = renderFold();
    await user.click(row());
    const action = screen.getByRole("button", { name: GIFT_DEFAULTS.buyLinkLabel });

    await user.click(action);
    expect(await screen.findByRole("dialog", { name: GIFT_SHEET_NAME })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sheetCancelLabel }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(action).toHaveFocus();
  });

  it("opens the redeem sheet from Redeem gift and returns focus on Escape", async () => {
    const user = renderFold();
    await user.click(row());
    const action = screen.getByRole("button", { name: GIFT_DEFAULTS.redeemLinkLabel });

    await user.click(action);
    expect(
      await screen.findByRole("dialog", { name: GIFT_DEFAULTS.redeemHeading }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(action).toHaveFocus();
  });

  it("reopens the redeem sheet with an empty code field", async () => {
    const user = renderFold();
    await user.click(row());
    const action = screen.getByRole("button", { name: GIFT_DEFAULTS.redeemLinkLabel });

    await user.click(action);
    await user.type(
      await screen.findByLabelText(GIFT_DEFAULTS.codeFieldLabel, { exact: true }),
      "WRONGCODE",
    );
    await user.keyboard("{Escape}");
    await user.click(action);

    expect(await screen.findByLabelText(GIFT_DEFAULTS.codeFieldLabel, { exact: true })).toHaveValue(
      "",
    );
  });

  it("shows Sanity copy in the row and the open lines", async () => {
    const user = renderFold({
      copy: {
        giftRowLabel: "A gift?",
        buyLead: "For a friend?",
        buyLinkLabel: "Give it",
        redeemLead: "Got a code?",
        redeemLinkLabel: "Use it",
      },
    });

    await user.click(screen.getByRole("button", { name: "A gift?" }));

    expect(screen.getByText("For a friend?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Give it" })).toBeInTheDocument();
    expect(screen.getByText("Got a code?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use it" })).toBeInTheDocument();
  });

  it("opens with the requested sheet showing", async () => {
    renderFold({ initialSheet: "redeem" });

    expect(row()).toHaveAttribute("aria-expanded", "true");
    expect(
      await screen.findByRole("dialog", { name: GIFT_DEFAULTS.redeemHeading }),
    ).toBeInTheDocument();
  });
});
