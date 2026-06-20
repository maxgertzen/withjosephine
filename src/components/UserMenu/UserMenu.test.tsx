import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { UserMenu } from "./UserMenu";

describe("UserMenu", () => {
  it("shows only the trigger until opened", () => {
    render(<UserMenu email="me@example.com" />);
    expect(
      screen.getByRole("button", { name: /your library and account/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Library" })).toBeNull();
  });

  it("opens to reveal the email, Library link, and Sign out", async () => {
    const user = userEvent.setup();
    render(<UserMenu email="me@example.com" />);

    await user.click(screen.getByRole("button", { name: /your library and account/i }));

    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute(
      "href",
      "/my-readings",
    );
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
