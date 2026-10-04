import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const constructEventMock = vi.fn();
const fetchHttpClient = { type: "fetch-client" };
const stripeCtorMock = Object.assign(
  vi.fn(function () {
    return { webhooks: { constructEvent: constructEventMock } };
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
