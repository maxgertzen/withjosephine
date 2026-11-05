import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { footerNewsletterSlot } from "@/components/Footer/footerNewsletterSlot";
import { NewsletterSlotProvider } from "@/components/Footer/NewsletterContext";
import { NEWSLETTER_DEFAULTS } from "@/data/defaults";
import { ROUTES } from "@/lib/constants";

import { GO_HOME_DELAY_MS } from "./GoHomeAfterDelay";
import { NewsletterConfirmView, type NewsletterConfirmViewState } from "./NewsletterConfirmView";

const ASK: NewsletterConfirmViewState = { kind: "ask", token: "t" };
const CONFIRMED: NewsletterConfirmViewState = { kind: "confirmed" };
const FAILED: NewsletterConfirmViewState = { kind: "failed" };

function renderWithFooterBoxOn(state: NewsletterConfirmViewState) {
  return render(
    <NewsletterSlotProvider slot={footerNewsletterSlot({ show: true, title: "Letters" })}>
      <NewsletterConfirmView words={NEWSLETTER_DEFAULTS} state={state} />
    </NewsletterSlotProvider>,
  );
}

function footerBoxHeading() {
  return screen.queryByRole("heading", { name: "Letters" });
}

describe("NewsletterConfirmView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([ASK, CONFIRMED])("hides the footer newsletter box ($kind)", (state) => {
    renderWithFooterBoxOn(state);

    expect(footerBoxHeading()).toBeNull();
  });

  it("keeps the footer newsletter box when the link did not work, so they can sign up again", () => {
    renderWithFooterBoxOn(FAILED);

    expect(footerBoxHeading()).toBeInTheDocument();
  });

  it("goes to the home page a few seconds after signing up", () => {
    renderWithFooterBoxOn(CONFIRMED);

    act(() => vi.advanceTimersByTime(GO_HOME_DELAY_MS - 1));
    expect(replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledWith(ROUTES.home);
  });

  it.each([ASK, FAILED])("stays on the page ($kind)", (state) => {
    renderWithFooterBoxOn(state);

    act(() => vi.advanceTimersByTime(GO_HOME_DELAY_MS * 2));
    expect(replace).not.toHaveBeenCalled();
  });
});
