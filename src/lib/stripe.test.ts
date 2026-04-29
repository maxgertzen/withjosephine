import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const constructEventMock = vi.fn();
const stripeCtorMock = vi.fn(function () {
  return { webhooks: { constructEvent: constructEventMock } };
});

vi.mock("stripe", () => ({
  default: stripeCtorMock,
}));

beforeEach(async () => {
  vi.resetModules();
  stripeCtorMock.mockClear();
  constructEventMock.mockReset();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_abc");
});

afterEach(() => {
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

  it("instantiates the Stripe client with the secret key from env", async () => {
    constructEventMock.mockReturnValue({});

    const { constructWebhookEvent } = await import("./stripe");
    constructWebhookEvent("body", "sig");

    expect(stripeCtorMock).toHaveBeenCalledWith("sk_test_123");
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
