import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isCronRequestAuthorized } from "./cron-auth";

const openNextFetch = vi.hoisted(() => vi.fn(async () => new Response("ok")));

vi.mock("@/test/open-next-worker.stub", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: { fetch: openNextFetch },
}));

vi.mock("@sentry/cloudflare", () => ({
  withSentry: (_options: unknown, handler: unknown) => handler,
  withMonitor: (_slug: string, callback: () => Promise<unknown>) => callback(),
}));

type WorkerEntry = {
  fetch(request: Request, env: object, ctx: object): Promise<Response>;
  scheduled(controller: { cron: string }, env: object, ctx: object): Promise<void>;
};

const workerEntryPath = "../../../custom-worker";
const { default: worker } = (await import(workerEntryPath)) as { default: WorkerEntry };

const env = { ENVIRONMENT: "production" };
const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };

function forwardedRequest(): Request {
  const [request] = openNextFetch.mock.calls.at(-1) as unknown as [Request];
  return request;
}

beforeEach(() => {
  openNextFetch.mockClear();
  vi.stubEnv("CRON_SECRET", "shhh");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("custom worker cron auth wiring", () => {
  it("public fetch reaches OpenNext without cf-cron, so cron auth rejects it", async () => {
    const request = new Request("https://withjosephine.com/api/cron/cleanup", {
      method: "POST",
      headers: { "cf-cron": "1" },
    });

    await worker.fetch(request, env, ctx);

    expect(forwardedRequest().headers.has("cf-cron")).toBe(false);
    expect(isCronRequestAuthorized(forwardedRequest())).toBe(false);
  });

  it("scheduled dispatch sends a request cron auth accepts", async () => {
    vi.stubEnv("CRON_SECRET", "");

    await worker.scheduled({ cron: "0 3 * * *" }, env, ctx);

    expect(forwardedRequest().url).toBe("https://withjosephine.com/api/cron/cleanup");
    expect(isCronRequestAuthorized(forwardedRequest())).toBe(true);
  });
});
