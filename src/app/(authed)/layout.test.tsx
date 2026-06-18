import { render, screen } from "@testing-library/react";
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
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { getActiveSession } from "@/lib/auth/listenSession";
import { findUserById } from "@/lib/auth/users";

import AuthedLayout from "./layout";

const sessionMock = vi.mocked(getActiveSession);
const userMock = vi.mocked(findUserById);

beforeEach(() => {
  cookiesGet.mockReset();
  sessionMock.mockReset();
  userMock.mockReset();
});

async function renderLayout() {
  const ui = await AuthedLayout({ children: <div>child</div> });
  render(ui);
}

describe("AuthedLayout top-bar", () => {
  it("shows the owner email and a Sign out control for a valid session", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    userMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });

    await renderLayout();

    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(
      document.querySelector('form[action="/api/auth/sign-out"][method="post"]'),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("links to the library (/my-readings) when signed in", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    userMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });

    await renderLayout();

    const libraryLink = screen.getByRole("link", { name: /^Library$/ });
    expect(libraryLink).toHaveAttribute("href", "/my-readings");
  });

  it("drops the redundant Home link; the wordmark is the sole home affordance", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    userMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });

    await renderLayout();

    expect(screen.queryByRole("link", { name: /^Home$/ })).toBeNull();
    const homeLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/");
    expect(homeLinks).toHaveLength(1);
    expect(homeLinks[0]).toHaveAccessibleName(/Josephine/);
  });

  it("renders no identity chip or sign-out when there is no session", async () => {
    cookiesGet.mockReturnValue(undefined);

    await renderLayout();

    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^Library$/ })).toBeNull();
    expect(userMock).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /Josephine/ })).toBeInTheDocument();
  });
});
