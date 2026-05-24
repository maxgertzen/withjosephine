import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../stripe", () => ({
  retrieveCheckoutSession: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchThankYouSessionSnapshot — bug #8", () => {
  it("flags isGift=true when session metadata.is_gift === 'true'", async () => {
    const { retrieveCheckoutSession } = await import("../stripe");
    vi.mocked(retrieveCheckoutSession).mockResolvedValue({
      id: "cs_test_gift_1",
      amount_total: 9900,
      currency: "usd",
      client_reference_id: "sub_gift_1",
      metadata: { is_gift: "true" },
    } as never);
    const { fetchThankYouSessionSnapshot } = await import("./thankYouSession");
    const snapshot = await fetchThankYouSessionSnapshot("cs_test_gift_1");
    expect(snapshot.isGift).toBe(true);
    expect(snapshot.submissionIdFromSession).toBe("sub_gift_1");
    expect(snapshot.paidAmount.cents).toBe(9900);
  });

  it("flags isGift=false when session metadata.is_gift is missing", async () => {
    const { retrieveCheckoutSession } = await import("../stripe");
    vi.mocked(retrieveCheckoutSession).mockResolvedValue({
      id: "cs_test_purchase_1",
      amount_total: 17900,
      currency: "usd",
      client_reference_id: "sub_purchase_1",
      metadata: null,
    } as never);
    const { fetchThankYouSessionSnapshot } = await import("./thankYouSession");
    const snapshot = await fetchThankYouSessionSnapshot("cs_test_purchase_1");
    expect(snapshot.isGift).toBe(false);
  });

  it("flags isGift=false when metadata.is_gift is the string 'false'", async () => {
    const { retrieveCheckoutSession } = await import("../stripe");
    vi.mocked(retrieveCheckoutSession).mockResolvedValue({
      id: "cs_test_purchase_2",
      amount_total: 7900,
      currency: "usd",
      client_reference_id: "sub_purchase_2",
      metadata: { is_gift: "false" },
    } as never);
    const { fetchThankYouSessionSnapshot } = await import("./thankYouSession");
    const snapshot = await fetchThankYouSessionSnapshot("cs_test_purchase_2");
    expect(snapshot.isGift).toBe(false);
  });

  it("returns safe defaults when Stripe API throws", async () => {
    const { retrieveCheckoutSession } = await import("../stripe");
    vi.mocked(retrieveCheckoutSession).mockRejectedValue(new Error("Stripe down"));
    const { fetchThankYouSessionSnapshot } = await import("./thankYouSession");
    const snapshot = await fetchThankYouSessionSnapshot("cs_test_err");
    expect(snapshot.isGift).toBe(false);
    expect(snapshot.paidAmount).toEqual({ cents: null, display: null });
    expect(snapshot.submissionIdFromSession).toBeNull();
  });
});
