import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  identifySubmission: vi.fn(),
}));

import { GIFT_DEFAULTS, PAYMENT_BUTTON_TEXT_FALLBACK } from "@/data/defaults";
import { CONSENT_ACK_MESSAGE } from "@/lib/compliance/intakeConsent";
import { respond } from "@/test/respond";

import { GiftSheet, type GiftSheetProps } from "./GiftSheet";

const ENDPOINT = "/api/gift/purchase";

function renderSheet(overrides: Partial<GiftSheetProps> = {}) {
  const user = userEvent.setup();
  render(
    <GiftSheet
      open
      onClose={vi.fn()}
      reading={{ slug: "birth-chart", name: "Birth Chart Reading", price: "$89" }}
      content={GIFT_DEFAULTS}
      loadingStateCopy="One moment - taking you to checkout."
      endpoint={ENDPOINT}
      {...overrides}
    />,
  );
  return user;
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Your first name/), "Dana");
  await user.type(screen.getByLabelText(/A note for them/), "Happy birthday");
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: PAYMENT_BUTTON_TEXT_FALLBACK }));
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "");
  Object.defineProperty(window, "location", { value: { href: "" }, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GiftSheet", () => {
  it("renders the title from the reading and the three steps", () => {
    renderSheet();
    expect(screen.getByRole("dialog", { name: "Birth Chart Reading · $89" })).toBeInTheDocument();
    expect(screen.getByText(GIFT_DEFAULTS.sheetStepPay)).toBeInTheDocument();
    expect(screen.getByText(GIFT_DEFAULTS.sheetStepSend)).toBeInTheDocument();
    expect(screen.getByText(GIFT_DEFAULTS.sheetStepRecipient)).toBeInTheDocument();
  });

  it("shows both required lines on an empty submit and posts nothing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = renderSheet();
    await user.click(screen.getByRole("button", { name: PAYMENT_BUTTON_TEXT_FALLBACK }));
    expect(screen.getByText(GIFT_DEFAULTS.buyerNameRequired)).toBeInTheDocument();
    expect(screen.getByText(CONSENT_ACK_MESSAGE)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hides the name help while the name error shows", async () => {
    const user = renderSheet();
    expect(screen.getByText(GIFT_DEFAULTS.buyerNameHelp)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: PAYMENT_BUTTON_TEXT_FALLBACK }));
    expect(screen.queryByText(GIFT_DEFAULTS.buyerNameHelp)).not.toBeInTheDocument();
  });

  it("shows the checkout overlay while submitting", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const user = renderSheet();
    await fillAndSubmit(user);
    expect(screen.getByRole("status")).toHaveTextContent("One moment - taking you to checkout.");
  });

  it("closes on Escape and a dim click while idle", async () => {
    const onClose = vi.fn();
    const user = renderSheet({ onClose });
    await user.keyboard("{Escape}");
    await user.click(screen.getByTestId("sheet-dim"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("stays open on Escape and a dim click while submitting", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const onClose = vi.fn();
    const user = renderSheet({ onClose });
    await fillAndSubmit(user);
    await user.keyboard("{Escape}");
    await user.click(screen.getByTestId("sheet-dim"));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the server error on a 503 and keeps the values", async () => {
    respond(503, { error: "Gifts are not available right now." });
    const user = renderSheet();
    await fillAndSubmit(user);
    expect(await screen.findByText(GIFT_DEFAULTS.sheetSubmitFailed)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Your first name/)).toHaveValue("Dana");
    expect(screen.getByLabelText(/A note for them/)).toHaveValue("Happy birthday");
    expect(window.location.href).toBe("");
  });

  it("masks the form for Clarity", () => {
    renderSheet();
    const form = screen.getByLabelText(/Your first name/).closest("form");
    expect(form).toHaveAttribute("data-clarity-mask", "True");
  });

  it("caps the name and note lengths", () => {
    renderSheet();
    expect(screen.getByLabelText(/Your first name/)).toHaveAttribute("maxlength", "80");
    expect(screen.getByLabelText(/A note for them/)).toHaveAttribute("maxlength", "280");
  });

  it("calls onClose from the cancel link", async () => {
    const onClose = vi.fn();
    const user = renderSheet({ onClose });
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sheetCancelLabel }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
