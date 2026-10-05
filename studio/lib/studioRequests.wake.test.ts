import { afterEach, describe, expect, it, vi } from "vitest";

import { requestDelivery, requestResend, wakeDelivery } from "./studioRequests";

function fakeClient() {
  const commit = vi.fn().mockResolvedValue({});
  const patch = { set: vi.fn(), unset: vi.fn(), commit };
  patch.set.mockReturnValue(patch);
  patch.unset.mockReturnValue(patch);
  return { client: { patch: vi.fn().mockReturnValue(patch) }, commit };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestDelivery", () => {
  it("saves the request, then wakes the site without reading the answer", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));
    const { client, commit } = fakeClient();

    const woke = await requestDelivery(client as never, "sub-1", "https://withjosephine.com");

    expect(commit).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://withjosephine.com/api/delivery/wake?submission=sub-1",
      { method: "POST", keepalive: true },
    );
    expect(commit.mock.invocationCallOrder[0]).toBeLessThan(fetchSpy.mock.invocationCallOrder[0]);
    expect(woke).toBe(true);
  });

  it("reports no wake when the site refuses, the call fails, or there is no site", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect(await wakeDelivery("https://withjosephine.com", "sub-1")).toBe(false);

    fetchSpy.mockRejectedValueOnce(new TypeError("offline"));
    expect(await wakeDelivery("https://withjosephine.com", "sub-1")).toBe(false);

    expect(await wakeDelivery(null, "sub-1")).toBe(false);
  });
});

describe("requestResend for gift emails", () => {
  it.each(["gift_confirmation", "gift_send", "gift_opened"] as const)(
    "saves a %s request with no address to send to, then wakes the site",
    async (emailType) => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 202 }));
      const { client, commit } = fakeClient();

      await requestResend(client as never, "gift-1", { emailType }, "https://withjosephine.com");

      const patch = client.patch.mock.results[0]!.value;
      expect(client.patch).toHaveBeenCalledWith("gift-1");
      expect(patch.set).toHaveBeenCalledWith({
        emailResendRequest: { emailType, requestedAt: expect.any(String) },
      });
      expect(commit).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://withjosephine.com/api/delivery/wake?submission=gift-1",
        { method: "POST", keepalive: true },
      );
    },
  );
});

describe("requestResend for a booking email", () => {
  it("saves the trimmed address typed into the dialog", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 202 }));
    const { client } = fakeClient();

    await requestResend(
      client as never,
      "sub-1",
      { emailType: "order_confirmation", sendTo: " anna@example.com " },
      null,
    );

    expect(client.patch.mock.results[0]!.value.set).toHaveBeenCalledWith({
      emailResendRequest: {
        emailType: "order_confirmation",
        correctedEmail: "anna@example.com",
        requestedAt: expect.any(String),
      },
    });
  });
});
