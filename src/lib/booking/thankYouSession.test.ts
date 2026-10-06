import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../stripe", () => ({
  retrieveCheckoutSession: vi.fn(),
}));

import { retrieveCheckoutSession } from "../stripe";
import { fetchThankYouSessionSnapshot } from "./thankYouSession";

const mockRetrieve = vi.mocked(retrieveCheckoutSession);

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchThankYouSessionSnapshot", () => {
  it("returns the session and the paid amount", async () => {
    const session = {
      id: "cs_test_purchase_1",
      amount_total: 17900,
      currency: "usd",
      client_reference_id: "sub_purchase_1",
    };
    mockRetrieve.mockResolvedValue(session as never);

    const snapshot = await fetchThankYouSessionSnapshot("cs_test_purchase_1");

    expect(snapshot).toEqual({
      kind: "ok",
      paidAmount: { cents: 17900, display: "$179.00" },
      session,
    });
  });

  it("returns a null paid amount when Stripe has no amount", async () => {
    mockRetrieve.mockResolvedValue({ id: "cs_test_free", amount_total: null } as never);
    const snapshot = await fetchThankYouSessionSnapshot("cs_test_free");
    expect(snapshot).toMatchObject({ kind: "ok", paidAmount: { cents: null, display: null } });
  });

  it("returns unavailable when Stripe throws, without logging the session id", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stripeError = Object.assign(new Error("No such checkout.session: 'cs_test_err'"), {
      type: "StripeInvalidRequestError",
    });
    mockRetrieve.mockRejectedValue(stripeError);

    const snapshot = await fetchThankYouSessionSnapshot("cs_test_err");

    expect(snapshot).toEqual({ kind: "unavailable" });
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = warn.mock.calls.flat().map(String).join(" ");
    expect(logged).toContain("StripeInvalidRequestError");
    expect(logged).not.toMatch(/cs_/);
  });
});
