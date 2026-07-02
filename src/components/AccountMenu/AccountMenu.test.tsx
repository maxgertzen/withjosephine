import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/UserMenu", () => ({
  UserMenu: ({ email }: { email: string }) => <div data-testid="user-menu">{email}</div>,
}));

import { AccountMenu } from "./AccountMenu";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

describe("AccountMenu", () => {
  it("shows a neutral placeholder before the auth check resolves", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<AccountMenu />);
    expect(screen.queryByTestId("user-menu")).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(container.querySelector("span[aria-hidden='true']")).not.toBeNull();
  });

  it("renders the UserMenu with the email when signed in", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ signedIn: true, email: "person@example.com" }));
    render(<AccountMenu />);
    await waitFor(() => expect(screen.getByTestId("user-menu")).toHaveTextContent("person@example.com"));
  });

  it("renders a Sign in link to the home page when signed out", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ signedIn: false }));
    render(<AccountMenu />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/"),
    );
  });

  it("falls back to the Sign in link when the auth check fails", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    render(<AccountMenu />);
    await waitFor(() => expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument());
  });
});
