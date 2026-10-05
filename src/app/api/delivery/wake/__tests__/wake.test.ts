import { beforeEach, describe, expect, it, vi } from "vitest";

const checkDeliveryWakeRateLimit = vi.fn();
const runStudioRequests = vi.fn();
const canRunStudioRequests = vi.fn();
const runMirror = vi.fn();

vi.mock("@/lib/booking/deliveryWakeRateLimit", () => ({
  checkDeliveryWakeRateLimit: () => checkDeliveryWakeRateLimit(),
}));
vi.mock("@/lib/booking/runStudioRequests", () => ({
  runStudioRequests: (scope: unknown) => runStudioRequests(scope),
  canRunStudioRequests: () => canRunStudioRequests(),
}));
vi.mock("@/lib/booking/persistence/runMirror", () => ({
  runMirror: (promise: Promise<void>) => runMirror(promise),
}));

import { POST } from "../route";

function wake(query = "?submission=sub-1") {
  return new Request(`https://withjosephine.com/api/delivery/wake${query}`, { method: "POST" });
}

beforeEach(() => {
  checkDeliveryWakeRateLimit.mockReset().mockResolvedValue(true);
  canRunStudioRequests.mockReset().mockReturnValue(true);
  runStudioRequests.mockReset().mockResolvedValue({ requested: 1 });
  runMirror.mockReset();
});

describe("/api/delivery/wake", () => {
  it("answers 202 at once and runs only the clicked submission in the background", async () => {
    const res = await POST(wake());

    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://withjosephine.sanity.studio",
    );
    expect(runStudioRequests).toHaveBeenCalledWith({ submissionId: "sub-1" });
    expect(runMirror).toHaveBeenCalledTimes(1);
  });

  it.each(["", "?submission=", "?submission=a%20b", `?submission=${"x".repeat(101)}`])(
    "answers 400 without running for %s",
    async (query) => {
      expect((await POST(wake(query))).status).toBe(400);
      expect(runStudioRequests).not.toHaveBeenCalled();
    },
  );

  it("answers 429 without running when the caller is over the limit", async () => {
    checkDeliveryWakeRateLimit.mockResolvedValue(false);

    expect((await POST(wake())).status).toBe(429);
    expect(runStudioRequests).not.toHaveBeenCalled();
  });

  it("answers 500 when the worker cannot sign delivery links", async () => {
    canRunStudioRequests.mockReturnValue(false);

    expect((await POST(wake())).status).toBe(500);
    expect(runStudioRequests).not.toHaveBeenCalled();
  });
});
