import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression suite for the 2026-05-25 silent-fail incident: a manual
 * `wrangler deploy --env staging` from a worktree whose `.env.local` carried
 * `NEXT_PUBLIC_SANITY_DATASET=production` baked the wrong dataset into the
 * Next.js bundle, so staging booking submissions silently landed in the
 * production dataset. `getSanityWriteClient` must resolve the dataset from
 * the Cloudflare runtime env, NOT from the build-baked process.env.
 */

const { mockGetCloudflareContext, mockCreateClient } = vi.hoisted(() => ({
  mockGetCloudflareContext: vi.fn(),
  mockCreateClient: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mockGetCloudflareContext,
}));

vi.mock("next-sanity", () => ({
  createClient: mockCreateClient,
}));

vi.mock("../taint", () => ({
  taintServerObject: vi.fn(),
}));

describe("getSanityWriteClient — dataset resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCloudflareContext.mockReset();
    mockCreateClient.mockReset().mockImplementation((cfg) => ({ ...cfg, __mock: true }));
    vi.stubEnv("NEXT_PUBLIC_SANITY_PROJECT_ID", "test-project");
    vi.stubEnv("SANITY_WRITE_TOKEN", "test-token");
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the Cloudflare runtime env dataset over the build-baked process.env value", async () => {
    mockGetCloudflareContext.mockResolvedValue({
      env: { NEXT_PUBLIC_SANITY_DATASET: "staging" },
    });

    const { getSanityWriteClient } = await import("./client");
    const client = (await getSanityWriteClient()) as unknown as { dataset: string };

    expect(client.dataset).toBe("staging");
    // createClient is called once at module-load for the read client, then
    // again when the write client is built. Assert on the write-client call.
    const writeCall = mockCreateClient.mock.calls.find(
      ([cfg]) => (cfg as { token?: string })?.token === "test-token",
    );
    expect(writeCall?.[0]).toMatchObject({
      dataset: "staging",
      useCdn: false,
      token: "test-token",
    });
  });

  it("falls back to the build-baked process.env value when the CF runtime env is absent", async () => {
    mockGetCloudflareContext.mockResolvedValue({ env: {} });

    const { getSanityWriteClient } = await import("./client");
    const client = (await getSanityWriteClient()) as unknown as { dataset: string };

    expect(client.dataset).toBe("production");
  });

  it("falls back to the build-baked value when getCloudflareContext throws (vitest, scripts, build-time)", async () => {
    mockGetCloudflareContext.mockImplementation(() => {
      throw new Error("not in request context");
    });

    const { getSanityWriteClient } = await import("./client");
    const client = (await getSanityWriteClient()) as unknown as { dataset: string };

    expect(client.dataset).toBe("production");
  });

  it("caches one client per dataset so repeated calls within the same isolate reuse the same instance", async () => {
    mockGetCloudflareContext.mockResolvedValue({
      env: { NEXT_PUBLIC_SANITY_DATASET: "staging" },
    });

    const { getSanityWriteClient } = await import("./client");
    const a = await getSanityWriteClient();
    const b = await getSanityWriteClient();

    expect(a).toBe(b);
    // One read client at module-load + one write client cached for staging.
    // Second getSanityWriteClient call should not produce a third createClient.
    const writeCalls = mockCreateClient.mock.calls.filter(
      ([cfg]) => (cfg as { token?: string })?.token === "test-token",
    );
    expect(writeCalls).toHaveLength(1);
  });
});
