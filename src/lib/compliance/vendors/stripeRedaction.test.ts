import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStripeRedactionJob } from "./stripeRedaction";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("createStripeRedactionJob", () => {
  it("returns ok=false when both id arrays are empty", async () => {
    const result = await createStripeRedactionJob({ customerIds: [], checkoutSessionIds: [] });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns ok=false when STRIPE_SECRET_KEY is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const result = await createStripeRedactionJob({
      customerIds: ["cus_1"],
      checkoutSessionIds: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("STRIPE_SECRET_KEY missing");
  });

  it("submits a form-encoded redaction job with validation_behavior=fix and Basic auth", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "redaction_job_123", status: "validating" }), {
        status: 200,
      }),
    );

    const result = await createStripeRedactionJob({
      customerIds: ["cus_1", "cus_2"],
      checkoutSessionIds: ["cs_test_a"],
    });

    expect(result).toEqual({ ok: true, trackingId: "redaction_job_123" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.stripe.com/v1/privacy/redaction_jobs");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Basic ${btoa("sk_test_123:")}`);
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const body = init.body as string;
    expect(body).toContain("validation_behavior=fix");
    expect(body).toContain("objects%5Bcustomers%5D%5B%5D=cus_1");
    expect(body).toContain("objects%5Bcustomers%5D%5B%5D=cus_2");
    expect(body).toContain("objects%5Bcheckout_sessions%5D%5B%5D=cs_test_a");
  });

  it("returns ok=false on HTTP 4xx with the response body excerpt", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Invalid customer cus_x" } }), {
        status: 400,
      }),
    );

    const result = await createStripeRedactionJob({
      customerIds: ["cus_x"],
      checkoutSessionIds: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("HTTP 400");
      expect(result.error).toContain("Invalid customer cus_x");
    }
  });

  it("returns ok=false when fetch throws (network failure)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await createStripeRedactionJob({
      customerIds: ["cus_1"],
      checkoutSessionIds: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("network down");
  });

  it("returns ok=false when 200 response lacks id field", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    const result = await createStripeRedactionJob({
      customerIds: ["cus_1"],
      checkoutSessionIds: [],
    });
    expect(result.ok).toBe(false);
  });
});
