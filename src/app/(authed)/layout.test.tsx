import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

import AuthedLayout, { AuthedUserMenu } from "./layout";

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

async function renderUserMenu() {
  render(await AuthedUserMenu());
}

describe("AuthedLayout top-bar", () => {
  it("shows a single account-menu trigger when signed in (email/links live inside it)", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    userMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });

    await renderUserMenu();

    expect(
      screen.getByRole("button", { name: /your library and account/i }),
    ).toBeInTheDocument();
    // Email + Sign out are not inline in the bar — they live in the closed menu.
    expect(screen.queryByText("ada@example.com")).toBeNull();
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it("opens the menu to reveal email, the library link, and Sign out", async () => {
    const user = userEvent.setup();
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    userMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });

    await renderUserMenu();
    await user.click(screen.getByRole("button", { name: /your library and account/i }));

    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Library$/ })).toHaveAttribute(
      "href",
      "/my-readings",
    );
    expect(
      document.querySelector('form[action="/api/auth/sign-out"][method="post"]'),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
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
