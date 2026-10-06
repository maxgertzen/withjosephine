import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { GIFT_CHECK_API_ROUTE } from "@/lib/http/routes";
import { respond } from "@/test/respond";

import { RedeemSheet, type RedeemSheetProps } from "./RedeemSheet";

const CODE = "K7M2 QX9P H4TR";
const assignMock = vi.fn();

function renderSheet(overrides: Partial<RedeemSheetProps> = {}) {
  const user = userEvent.setup();
  render(
    <RedeemSheet
      open
      onClose={vi.fn()}
      readingSlug="birth-chart"
      content={GIFT_DEFAULTS}
      endpoint={GIFT_CHECK_API_ROUTE}
      {...overrides}
    />,
  );
  return user;
}

async function redeem(user: ReturnType<typeof userEvent.setup>, code = CODE) {
  if (code) await user.type(screen.getByLabelText(GIFT_DEFAULTS.codeFieldLabel), code);
  await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel }));
}

beforeEach(() => {
  assignMock.mockReset();
  Object.defineProperty(window, "location", {
    value: { assign: assignMock },
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RedeemSheet", () => {
  it("renders the eyebrow, heading and help as a labelled dialog", () => {
    renderSheet();
    expect(screen.getByRole("dialog", { name: GIFT_DEFAULTS.redeemHeading })).toBeInTheDocument();
    expect(screen.getByText(GIFT_DEFAULTS.sheetEyebrow)).toBeInTheDocument();
    expect(screen.getByText(GIFT_DEFAULTS.redeemBody)).toBeInTheDocument();
  });

  it("masks the code field for Clarity", () => {
    renderSheet();
    expect(
      screen.getByLabelText(GIFT_DEFAULTS.codeFieldLabel).closest("[data-clarity-mask]"),
    ).toHaveAttribute("data-clarity-mask", "True");
  });

  it("shows the empty error and posts nothing when Redeem is pressed with no code", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = renderSheet();
    await redeem(user, "");
    expect(screen.getByRole("alert")).toHaveTextContent(GIFT_DEFAULTS.redeemSheetEmpty);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows not found and posts nothing for a code that cannot be a gift code", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = renderSheet();
    await redeem(user, "K7M2");
    expect(screen.getByRole("alert")).toHaveTextContent(GIFT_DEFAULTS.codeNotFound);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts nothing while typing or on blur", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = renderSheet();
    await user.type(screen.getByLabelText(GIFT_DEFAULTS.codeFieldLabel), CODE);
    await user.tab();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows Checking only while the request is in flight", async () => {
    let release: (response: Response) => void = () => {};
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    );
    const user = renderSheet();
    expect(screen.queryByText(GIFT_DEFAULTS.codeChecking)).not.toBeInTheDocument();

    await redeem(user);
    expect(screen.getByText(GIFT_DEFAULTS.codeChecking)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel })).toBeDisabled();

    release(new Response(JSON.stringify({ result: "not_found" }), { status: 200 }));
    expect(await screen.findByRole("alert")).toHaveTextContent(GIFT_DEFAULTS.codeNotFound);
    expect(screen.queryByText(GIFT_DEFAULTS.codeChecking)).not.toBeInTheDocument();
  });

  it("posts the typed code and the reading slug once", async () => {
    const fetchSpy = respond(200, { result: "not_found" });
    const user = renderSheet();
    await redeem(user);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(GIFT_CHECK_API_ROUTE);
    expect(JSON.parse(String(init?.body))).toEqual({ code: CODE, readingSlug: "birth-chart" });
  });

  it("goes to the gift page for a valid code", async () => {
    respond(200, { result: "valid", path: "/gift/K7M2QX9PH4TR" });
    const user = renderSheet();
    await redeem(user);
    expect(assignMock).toHaveBeenCalledWith("/gift/K7M2QX9PH4TR");
  });

  it("offers the other reading for a code bought for it", async () => {
    respond(200, {
      result: "other_reading",
      readingSlug: "soul-blueprint",
      readingName: "Soul Blueprint",
      path: "/gift/K7M2QX9PH4TR",
    });
    const user = renderSheet();
    await redeem(user);

    expect(screen.getByRole("alert")).toHaveTextContent("This code is for the Soul Blueprint.");
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Go to the Soul Blueprint" }));
    expect(assignMock).toHaveBeenCalledWith("/gift/K7M2QX9PH4TR");
  });

  it.each([
    ["a 429", 429, { result: "rate_limited" }, GIFT_DEFAULTS.codeTooManyTries],
    ["a server error", 500, {}, GIFT_DEFAULTS.sheetSubmitFailed],
  ])("shows the matching error for %s", async (_label, status, body, message) => {
    respond(status, body);
    const user = renderSheet();
    await redeem(user);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("shows the network error when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const user = renderSheet();
    await redeem(user);
    expect(screen.getByRole("alert")).toHaveTextContent(GIFT_DEFAULTS.sheetNetworkFailed);
  });

  it("clears the error and the other-reading button when the code changes", async () => {
    respond(200, {
      result: "other_reading",
      readingSlug: "soul-blueprint",
      readingName: "Soul Blueprint",
      path: "/gift/K7M2QX9PH4TR",
    });
    const user = renderSheet();
    await redeem(user);
    await user.type(screen.getByLabelText(GIFT_DEFAULTS.codeFieldLabel), "A");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel })).toBeEnabled();
  });

  it("posts nothing without an endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = renderSheet({ endpoint: null });
    await redeem(user);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("closes from Not now", async () => {
    const onClose = vi.fn();
    const user = renderSheet({ onClose });
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sheetCancelLabel }));
    expect(onClose).toHaveBeenCalled();
  });
});
