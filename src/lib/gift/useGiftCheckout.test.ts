import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requestFreshToken, turnstileState } = vi.hoisted(() => ({
  requestFreshToken: vi.fn<() => Promise<string | null>>(),
  turnstileState: { required: true },
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  identifySubmission: vi.fn(),
}));

vi.mock("@/lib/intake/useTurnstileChallenge", () => ({
  useTurnstileChallenge: () => ({
    turnstileRequired: turnstileState.required,
    turnstileSiteKey: "site-key",
    turnstileToken: null,
    turnstileRef: { current: null },
    handleSuccess: vi.fn(),
    handleFailure: vi.fn(),
    requestFreshToken,
  }),
}));

import { GIFT_DEFAULTS } from "@/data/defaults";
import { identifySubmission, track } from "@/lib/analytics";
import { CONSENT_ACK_MESSAGE } from "@/lib/compliance/intakeConsent";
import { respond } from "@/test/respond";

import { type GiftCheckoutValues, useGiftCheckout } from "./useGiftCheckout";

const ENDPOINT = "/api/gift/purchase";
const FILLED: GiftCheckoutValues = {
  buyerFirstName: "Dana",
  note: "Happy birthday",
  coolingOffConsent: true,
  honeypot: "",
};

function renderCheckout(endpoint: string | null = ENDPOINT) {
  return renderHook(() =>
    useGiftCheckout({ readingSlug: "birth-chart", endpoint, messages: GIFT_DEFAULTS }),
  );
}

beforeEach(() => {
  turnstileState.required = true;
  requestFreshToken.mockResolvedValue("turnstile-token");
  Object.defineProperty(window, "location", { value: { href: "" }, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useGiftCheckout", () => {
  it("requests a Turnstile token before the POST", async () => {
    const order: string[] = [];
    requestFreshToken.mockImplementation(async () => {
      order.push("turnstile");
      return "turnstile-token";
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      order.push("fetch");
      return new Response(JSON.stringify({ paymentUrl: "https://buy.stripe.com/x", giftId: "g1" }));
    });
    const { result } = renderCheckout();
    await act(() => result.current.submit(FILLED));
    expect(order).toEqual(["turnstile", "fetch"]);
  });

  it("posts the request body with the honeypot field", async () => {
    const fetchSpy = respond(200, { paymentUrl: "https://buy.stripe.com/x", giftId: "g1" });
    const { result } = renderCheckout();
    await act(() => result.current.submit({ ...FILLED, honeypot: "bot" }));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(JSON.parse(String(init?.body))).toEqual({
      readingSlug: "birth-chart",
      buyerFirstName: "Dana",
      note: "Happy birthday",
      coolingOffConsent: true,
      turnstileToken: "turnstile-token",
      website: "bot",
    });
  });

  it("identifies, tracks the redirect with gift_<id> and sends the browser to the payment link", async () => {
    respond(200, { paymentUrl: "https://buy.stripe.com/x", giftId: "g1" });
    const { result } = renderCheckout();
    await act(() => result.current.submit(FILLED));
    expect(identifySubmission).toHaveBeenCalledWith("gift_g1");
    expect(track).toHaveBeenCalledWith("stripe_redirect", {
      reading_id: "birth-chart",
      submission_id: "gift_g1",
    });
    expect(window.location.href).toBe("https://buy.stripe.com/x");
    expect(result.current.isSubmitting).toBe(true);
  });

  it("shows the missing-field errors and posts nothing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderCheckout();
    await act(() =>
      result.current.submit({ ...FILLED, buyerFirstName: "   ", coolingOffConsent: false }),
    );
    expect(result.current.errors).toEqual({
      buyerFirstName: GIFT_DEFAULTS.buyerNameRequired,
      coolingOff: CONSENT_ACK_MESSAGE,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(requestFreshToken).not.toHaveBeenCalled();
  });

  it("treats a name of only brace tags as missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderCheckout();
    await act(() => result.current.submit({ ...FILLED, buyerFirstName: "{code}" }));
    expect(result.current.errors).toEqual({ buyerFirstName: GIFT_DEFAULTS.buyerNameRequired });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never fetches without an endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderCheckout(null);
    await act(() => result.current.submit(FILLED));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("maps server field errors to their lines", async () => {
    respond(400, { error: "Validation failed", fieldErrors: { buyerFirstName: "required" } });
    const { result } = renderCheckout();
    await act(() => result.current.submit(FILLED));
    expect(result.current.errors).toEqual({ buyerFirstName: GIFT_DEFAULTS.buyerNameRequired });
    expect(result.current.isSubmitting).toBe(false);
  });

  it("maps a cooling-off field error to the consent line", async () => {
    respond(400, { error: "Validation failed", fieldErrors: { coolingOff: "required" } });
    const { result } = renderCheckout();
    await act(() => result.current.submit(FILLED));
    expect(result.current.errors).toEqual({ coolingOff: CONSENT_ACK_MESSAGE });
  });

  it.each([{ note: "too_long" }, { buyerFirstName: "too_long" }])(
    "shows the form line for a server field error that is not a missing field (%o)",
    async (fieldErrors) => {
      respond(400, { error: "Validation failed", fieldErrors });
      const { result } = renderCheckout();
      await act(() => result.current.submit(FILLED));
      expect(result.current.errors).toEqual({ form: GIFT_DEFAULTS.sheetSubmitFailed });
    },
  );

  it("shows the server error on a 503", async () => {
    respond(503, { error: "Gifts are not available right now." });
    const { result } = renderCheckout();
    await act(() => result.current.submit(FILLED));
    expect(result.current.errors).toEqual({ form: GIFT_DEFAULTS.sheetSubmitFailed });
    expect(window.location.href).toBe("");
  });

  it("shows the network error when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const { result } = renderCheckout();
    await act(() => result.current.submit(FILLED));
    expect(result.current.errors).toEqual({ form: GIFT_DEFAULTS.sheetNetworkFailed });
    expect(result.current.isSubmitting).toBe(false);
  });

  it("shows the server error when Turnstile gives no token", async () => {
    requestFreshToken.mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderCheckout();
    await act(() => result.current.submit(FILLED));
    expect(result.current.errors).toEqual({ form: GIFT_DEFAULTS.sheetSubmitFailed });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
