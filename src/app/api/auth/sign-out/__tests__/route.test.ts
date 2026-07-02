import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
  revokeSession: vi.fn(),
  buildClearedListenSessionCookieHeader: () =>
    "__Host-listen_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
}));

vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi.fn(async () => ({ ipHash: "ip", userAgentHash: "ua" })),
}));

const cookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

import { getActiveSession, revokeSession } from "@/lib/auth/listenSession";

const sessionMock = vi.mocked(getActiveSession);
const revokeMock = vi.mocked(revokeSession);

beforeEach(() => {
  cookiesGet.mockReset();
  sessionMock.mockReset();
  revokeMock.mockReset();
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request("https://withjosephine.com/api/auth/sign-out", { method: "POST" }));
}

describe("POST /api/auth/sign-out", () => {
  it("revokes the active session, clears the cookie, and 303s home", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });

    const res = await callRoute();

    expect(revokeMock).toHaveBeenCalledTimes(1);
    expect(revokeMock.mock.calls[0]![0]).toMatchObject({ sessionId: "sess_1", userId: "user_1" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://withjosephine.com/");
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("clears the cookie and 303s home even with no cookie present (no revoke)", async () => {
    cookiesGet.mockReturnValue(undefined);

    const res = await callRoute();

    expect(revokeMock).not.toHaveBeenCalled();
    expect(res.status).toBe(303);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("clears the cookie without revoking when the session is already invalid", async () => {
    cookiesGet.mockReturnValue({ value: "stale" });
    sessionMock.mockResolvedValue(null);

    const res = await callRoute();

    expect(revokeMock).not.toHaveBeenCalled();
    expect(res.status).toBe(303);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
