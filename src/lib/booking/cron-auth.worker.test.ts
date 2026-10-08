import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openNextFetch = vi.hoisted(() => vi.fn(async () => new Response("ok")));
const withMonitor = vi.hoisted(() =>
  vi.fn((_slug: string, callback: () => Promise<unknown>) => callback()),
);

vi.mock("@/test/open-next-worker.stub", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: { fetch: openNextFetch },
}));

vi.mock("@sentry/cloudflare", () => ({
  withSentry: (_options: unknown, handler: unknown) => handler,
  withMonitor,
}));

type WorkerEntry = {
  fetch(request: Request, env: object, ctx: object): Promise<Response>;
  scheduled(controller: { cron: string }, env: object, ctx: object): Promise<void>;
};

const workerEntryPath = "../../../custom-worker";
const { default: worker } = (await import(workerEntryPath)) as { default: WorkerEntry };

const env = { ENVIRONMENT: "production", CRON_SECRET: "from-worker-env" };
const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };

function forwardedRequest(): Request {
  const [request] = openNextFetch.mock.calls.at(-1) as unknown as [Request];
  return request;
}

beforeEach(() => {
  openNextFetch.mockClear();
  withMonitor.mockClear();
  vi.stubEnv("CRON_SECRET", "shhh");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("custom worker cron auth wiring", () => {
  it("scheduled dispatch sends the worker env CRON_SECRET as Bearer", async () => {
    await worker.scheduled({ cron: "0 3 * * *" }, env, ctx);

    expect(forwardedRequest().url).toBe("https://withjosephine.com/api/cron/cleanup");
    expect(forwardedRequest().headers.get("authorization")).toBe("Bearer from-worker-env");
  });

  it("scheduled dispatch sends nothing and logs an error when CRON_SECRET is missing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await worker.scheduled({ cron: "0 3 * * *" }, { ENVIRONMENT: "production" }, ctx);

    expect(openNextFetch).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("CRON_SECRET is not set"));
    error.mockRestore();
  });

  it("wraps the deliver-requested dispatch in the Sentry cron monitor", async () => {
    await worker.scheduled({ cron: "*/15 * * * *" }, env, ctx);

    expect(forwardedRequest().url).toBe("https://withjosephine.com/api/cron/deliver-requested");
    expect(withMonitor).toHaveBeenCalledWith(
      "email-day-7-deliver",
      expect.any(Function),
      { schedule: { type: "crontab", value: "*/15 * * * *" } },
    );
  });
});
