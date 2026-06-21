import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
}));

vi.mock("@/lib/auth/users", () => ({
  findUserById: vi.fn(),
}));

const cookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

import { getActiveSession } from "@/lib/auth/listenSession";
import { findUserById } from "@/lib/auth/users";

const sessionMock = vi.mocked(getActiveSession);
const userMock = vi.mocked(findUserById);

beforeEach(() => {
  cookiesGet.mockReset();
  sessionMock.mockReset();
  userMock.mockReset();
});

async function callRoute(): Promise<Response> {
  const { GET } = await import("../route");
  return GET();
}

describe("GET /api/auth/me", () => {
  it("returns signedIn:true and the email for a valid session", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    userMock.mockResolvedValue({ id: "user_1", email: "person@example.com" });

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedIn: true, email: "person@example.com" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns signedIn:false when no cookie is present", async () => {
    cookiesGet.mockReturnValue(undefined);

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedIn: false });
    expect(sessionMock).not.toHaveBeenCalled();
  });

  it("returns signedIn:false when the session is invalid", async () => {
    cookiesGet.mockReturnValue({ value: "stale" });
    sessionMock.mockResolvedValue(null);

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedIn: false });
    expect(userMock).not.toHaveBeenCalled();
  });

  it("returns signedIn:false when the user row is missing", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "ghost", sessionId: "sess_1", elevatedAt: null });
    userMock.mockResolvedValue(null);

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedIn: false });
  });
});
