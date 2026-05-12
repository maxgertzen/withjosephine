import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Minimal DurableObject base for the test sandbox. Real Cloudflare runtime
// assigns `this.ctx` and `this.env` in the base constructor; we mirror that.
vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    ctx: unknown;
    env: unknown;
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx;
      this.env = env;
    }
  },
}));

import { GiftClaimScheduler, type GiftClaimSchedulerEnv } from "../GiftClaimScheduler";

type Storage = {
  data: Map<string, unknown>;
  alarmAtMs: number | null;
  deletedAll: boolean;
};

function makeStorage(): Storage & {
  api: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    setAlarm(ms: number): Promise<void>;
    deleteAlarm(): Promise<void>;
    deleteAll(): Promise<void>;
  };
} {
  const state: Storage = {
    data: new Map(),
    alarmAtMs: null,
    deletedAll: false,
  };
  const api = {
    async get<T>(key: string): Promise<T | undefined> {
      return state.data.get(key) as T | undefined;
    },
    async put<T>(key: string, value: T): Promise<void> {
      state.data.set(key, value);
    },
    async setAlarm(ms: number): Promise<void> {
      state.alarmAtMs = ms;
    },
    async deleteAlarm(): Promise<void> {
      state.alarmAtMs = null;
    },
    async deleteAll(): Promise<void> {
      state.deletedAll = true;
      state.data.clear();
      state.alarmAtMs = null;
    },
  };
  return Object.assign(state, { api });
}

function makeCtx(storage: ReturnType<typeof makeStorage>) {
  return { storage: storage.api };
}

const ENV: GiftClaimSchedulerEnv = {
  DO_DISPATCH_SECRET: "test-secret",
  NEXT_PUBLIC_SITE_ORIGIN: "https://test.local",
};

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("GiftClaimScheduler.fetch — /schedule", () => {
  it("stores submissionId, resets retryCount, sets alarm", async () => {
    const storage = makeStorage();
    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    const fireAtMs = 1_800_000_000_000;
    const req = new Request("https://do/schedule", {
      method: "POST",
      body: JSON.stringify({ fireAtMs, submissionId: "sub_gift" }),
    });
    const res = await scheduler.fetch(req);
    expect(res.status).toBe(200);
    expect(await storage.api.get("submissionId")).toBe("sub_gift");
    expect(await storage.api.get("retryCount")).toBe(0);
    expect(storage.alarmAtMs).toBe(fireAtMs);
  });

  it("returns 400 on malformed body", async () => {
    const storage = makeStorage();
    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    const req = new Request("https://do/schedule", {
      method: "POST",
      body: JSON.stringify({ fireAtMs: "not-a-number" }),
    });
    const res = await scheduler.fetch(req);
    expect(res.status).toBe(400);
    expect(storage.alarmAtMs).toBeNull();
  });

  it("returns 404 for unknown path", async () => {
    const storage = makeStorage();
    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    const req = new Request("https://do/other", { method: "POST", body: "{}" });
    const res = await scheduler.fetch(req);
    expect(res.status).toBe(404);
  });
});

describe("GiftClaimScheduler.fetch — /cancel", () => {
  it("clears alarm and storage", async () => {
    const storage = makeStorage();
    await storage.api.put("submissionId", "sub_gift");
    await storage.api.put("retryCount", 1);
    await storage.api.setAlarm(1_800_000_000_000);

    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    const req = new Request("https://do/cancel", { method: "POST", body: "{}" });
    const res = await scheduler.fetch(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cancelled: true });
    expect(storage.alarmAtMs).toBeNull();
    expect(storage.deletedAll).toBe(true);
    expect(storage.data.size).toBe(0);
  });

  it("is idempotent when nothing is stored", async () => {
    const storage = makeStorage();
    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    const req = new Request("https://do/cancel", { method: "POST", body: "{}" });
    const res = await scheduler.fetch(req);
    expect(res.status).toBe(200);
    expect(storage.alarmAtMs).toBeNull();
  });
});

describe("GiftClaimScheduler.alarm", () => {
  it("clears storage and exits when no submissionId stored", async () => {
    const storage = makeStorage();
    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    await scheduler.alarm();
    expect(storage.deletedAll).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to dispatch route with submissionId + retryCount", async () => {
    const storage = makeStorage();
    await storage.api.put("submissionId", "sub_gift");
    await storage.api.put("retryCount", 2);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ outcome: "reminder", nextAlarmMs: 9_999_999_999 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    await scheduler.alarm();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://test.local/api/internal/gift-claim-dispatch");
    expect((init.headers as Record<string, string>)["x-do-secret"]).toBe("test-secret");
    expect(JSON.parse(init.body as string)).toEqual({
      submissionId: "sub_gift",
      retryCount: 2,
    });
  });

  it("increments retryCount and reschedules when nextAlarmMs returned", async () => {
    const storage = makeStorage();
    await storage.api.put("submissionId", "sub_gift");
    await storage.api.put("retryCount", 1);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ outcome: "first_send", nextAlarmMs: 2_000_000_000_000 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    await scheduler.alarm();

    expect(await storage.api.get("retryCount")).toBe(2);
    expect(storage.alarmAtMs).toBe(2_000_000_000_000);
    expect(storage.deletedAll).toBe(false);
  });

  it("clears storage when nextAlarmMs is null", async () => {
    const storage = makeStorage();
    await storage.api.put("submissionId", "sub_gift");
    await storage.api.put("retryCount", 3);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ outcome: "stop", reason: "abandoned", nextAlarmMs: null }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    await scheduler.alarm();

    expect(storage.deletedAll).toBe(true);
  });

  it("does not reschedule when dispatch returns non-200", async () => {
    const storage = makeStorage();
    await storage.api.put("submissionId", "sub_gift");
    await storage.api.put("retryCount", 0);
    fetchMock.mockResolvedValueOnce(new Response("kaboom", { status: 500 }));

    const scheduler = new GiftClaimScheduler(makeCtx(storage) as never, ENV as never);
    await scheduler.alarm();

    expect(storage.alarmAtMs).toBeNull();
    expect(storage.deletedAll).toBe(false);
  });
});
