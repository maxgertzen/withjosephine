import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const constructEventMock = vi.fn();
const refundsCreateMock = vi.fn();
const sessionsRetrieveMock = vi.fn();
const fetchHttpClient = { type: "fetch-client" };
const stripeCtorMock = Object.assign(
  vi.fn(function () {
    return {
      webhooks: { constructEvent: constructEventMock },
      refunds: { create: refundsCreateMock },
      checkout: { sessions: { retrieve: sessionsRetrieveMock } },
    };
  }),
  { createFetchHttpClient: vi.fn(() => fetchHttpClient) },
);

vi.mock("stripe", () => ({
  default: stripeCtorMock,
}));

beforeEach(async () => {
  vi.resetModules();
  stripeCtorMock.mockClear();
  constructEventMock.mockReset();
  refundsCreateMock.mockReset();
  sessionsRetrieveMock.mockReset();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_abc");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("constructWebhookEvent", () => {
  it("calls stripe.webhooks.constructEvent with the raw body, signature, and webhook secret", async () => {
    const fakeEvent = { id: "evt_1", type: "checkout.session.completed" };
    constructEventMock.mockReturnValue(fakeEvent);

    const { constructWebhookEvent } = await import("./stripe");
    const result = constructWebhookEvent("raw-body", "sig-header");

    expect(constructEventMock).toHaveBeenCalledWith("raw-body", "sig-header", "whsec_abc");
    expect(result).toBe(fakeEvent);
  });

  it("instantiates the Stripe client with the secret key, a fetch httpClient, and a timeout", async () => {
    constructEventMock.mockReturnValue({});

    const { constructWebhookEvent } = await import("./stripe");
    constructWebhookEvent("body", "sig");

    expect(stripeCtorMock).toHaveBeenCalledWith("sk_test_123", {
      httpClient: fetchHttpClient,
      timeout: 5000,
    });
  });

  it("points the client at STRIPE_API_HOST when E2E is 1", async () => {
    vi.stubEnv("E2E", "1");
    vi.stubEnv("STRIPE_API_HOST", "http://127.0.0.1:47391");
    constructEventMock.mockReturnValue({});

    const { constructWebhookEvent } = await import("./stripe");
    constructWebhookEvent("body", "sig");

    expect(stripeCtorMock).toHaveBeenCalledWith("sk_test_123", {
      httpClient: fetchHttpClient,
      timeout: 5000,
      host: "127.0.0.1",
      port: "47391",
      protocol: "http",
    });
  });

  it.each([undefined, "0"])("ignores STRIPE_API_HOST when E2E is %s", async (e2e) => {
    vi.stubEnv("E2E", e2e);
    vi.stubEnv("STRIPE_API_HOST", "http://127.0.0.1:47391");
    constructEventMock.mockReturnValue({});

    const { constructWebhookEvent } = await import("./stripe");
    constructWebhookEvent("body", "sig");

    expect(stripeCtorMock).toHaveBeenCalledWith("sk_test_123", {
      httpClient: fetchHttpClient,
      timeout: 5000,
    });
  });

  it("throws when STRIPE_SECRET_KEY is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { constructWebhookEvent } = await import("./stripe");
    expect(() => constructWebhookEvent("body", "sig")).toThrow(
      "Missing required env var: STRIPE_SECRET_KEY",
    );
  });

  it("throws when STRIPE_WEBHOOK_SECRET is missing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const { constructWebhookEvent } = await import("./stripe");
    expect(() => constructWebhookEvent("body", "sig")).toThrow(
      "Missing required env var: STRIPE_WEBHOOK_SECRET",
    );
  });
});

describe("refundDuplicateCheckoutSession", () => {
  const SESSION = {
    id: "cs_test_duplicate",
    payment_intent: "pi_test_duplicate",
    amount_total: 8900,
  } as Stripe.Checkout.Session;
  const METADATA = { client_reference_id: "gift_abc" };
  const REFUND = { id: "re_test_1", amount: 8900, status: "succeeded" };

  function stripeError(code: string) {
    return Object.assign(new Error(code), { code });
  }

  it("refunds the payment intent as a duplicate with a per-session, per-hour idempotency key", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-05T14:59:59.000Z") });
    refundsCreateMock.mockResolvedValue(REFUND);

    const { duplicateRefundKey, refundDuplicateCheckoutSession } = await import("./stripe");
    const result = await refundDuplicateCheckoutSession(SESSION, METADATA);

    expect(refundsCreateMock).toHaveBeenCalledWith(
      { payment_intent: "pi_test_duplicate", reason: "duplicate", metadata: METADATA },
      { idempotencyKey: `${duplicateRefundKey(SESSION.id)}/2026-10-05T14` },
    );
    expect(result).toEqual({ kind: "refund", refund: REFUND });
  });

  it("uses a new idempotency key in the next hour so a stored error is not replayed", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-05T14:59:59.000Z") });
    refundsCreateMock.mockRejectedValueOnce(stripeError("api_error")).mockResolvedValue(REFUND);

    const { duplicateRefundKey, refundDuplicateCheckoutSession } = await import("./stripe");
    await expect(refundDuplicateCheckoutSession(SESSION, METADATA)).rejects.toThrow("api_error");
    vi.setSystemTime(new Date("2026-10-05T15:00:00.000Z"));
    await refundDuplicateCheckoutSession(SESSION, METADATA);

    expect(refundsCreateMock.mock.calls.map(([, options]) => options.idempotencyKey)).toEqual([
      `${duplicateRefundKey(SESSION.id)}/2026-10-05T14`,
      `${duplicateRefundKey(SESSION.id)}/2026-10-05T15`,
    ]);
  });

  it("reads the id of an expanded payment intent", async () => {
    refundsCreateMock.mockResolvedValue(REFUND);

    const { refundDuplicateCheckoutSession } = await import("./stripe");
    await refundDuplicateCheckoutSession(
      { ...SESSION, payment_intent: { id: "pi_test_expanded" } } as Stripe.Checkout.Session,
      METADATA,
    );

    expect(refundsCreateMock.mock.calls[0][0]).toMatchObject({
      payment_intent: "pi_test_expanded",
    });
  });

  it.each([
    ["charge_already_refunded", "already_refunded"],
    ["idempotency_key_in_use", "in_flight"],
  ])("maps %s to %s", async (code, kind) => {
    refundsCreateMock.mockRejectedValue(stripeError(code));

    const { refundDuplicateCheckoutSession } = await import("./stripe");
    expect(await refundDuplicateCheckoutSession(SESSION, METADATA)).toEqual({ kind });
  });

  it("reports nothing_to_refund without calling Stripe for a zero amount", async () => {
    const { refundDuplicateCheckoutSession } = await import("./stripe");
    const result = await refundDuplicateCheckoutSession(
      { ...SESSION, amount_total: 0, payment_intent: null } as Stripe.Checkout.Session,
      METADATA,
    );

    expect(result).toEqual({ kind: "nothing_to_refund" });
    expect(refundsCreateMock).not.toHaveBeenCalled();
  });

  it("reports no_payment_intent without calling Stripe when a paid session has none", async () => {
    const { refundDuplicateCheckoutSession } = await import("./stripe");
    const result = await refundDuplicateCheckoutSession(
      { ...SESSION, payment_intent: null } as Stripe.Checkout.Session,
      METADATA,
    );

    expect(result).toEqual({ kind: "no_payment_intent" });
    expect(refundsCreateMock).not.toHaveBeenCalled();
  });

  it("throws other Stripe errors", async () => {
    refundsCreateMock.mockRejectedValue(stripeError("resource_missing"));

    const { refundDuplicateCheckoutSession } = await import("./stripe");
    await expect(refundDuplicateCheckoutSession(SESSION, METADATA)).rejects.toThrow(
      "resource_missing",
    );
  });
});

describe("retrieveKeptPayment", () => {
  const CHARGE = { status: "succeeded", refunded: false, amount_refunded: 0, disputed: false };

  it("reads the kept session with its payment intent's latest charge expanded", async () => {
    sessionsRetrieveMock.mockResolvedValue({
      client_reference_id: "gift_abc",
      payment_status: "paid",
      payment_intent: { id: "pi_test_kept", latest_charge: CHARGE },
    });

    const { KEPT_PAYMENT_EXPAND, retrieveKeptPayment } = await import("./stripe");
    const kept = await retrieveKeptPayment("cs_test_kept");

    expect(sessionsRetrieveMock).toHaveBeenCalledWith("cs_test_kept", {
      expand: KEPT_PAYMENT_EXPAND,
    });
    expect(kept).toEqual({ clientReferenceId: "gift_abc", paymentStatus: "paid", charge: CHARGE });
  });

  it.each([
    ["no payment intent", null],
    ["a payment intent id only", "pi_test_kept"],
    ["no latest charge", { id: "pi_test_kept", latest_charge: null }],
    ["a charge id only", { id: "pi_test_kept", latest_charge: "ch_test_kept" }],
  ])("returns no charge for %s", async (_case, paymentIntent) => {
    sessionsRetrieveMock.mockResolvedValue({
      client_reference_id: "gift_abc",
      payment_status: "paid",
      payment_intent: paymentIntent,
    });

    const { retrieveKeptPayment } = await import("./stripe");
    expect((await retrieveKeptPayment("cs_test_kept")).charge).toBeNull();
  });
});
