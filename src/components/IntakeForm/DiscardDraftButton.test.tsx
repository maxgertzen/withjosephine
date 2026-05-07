import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DiscardDraftButton } from "./DiscardDraftButton";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DiscardDraftButton", () => {
  it("renders the default label", () => {
    render(<DiscardDraftButton onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: "Clear form" })).toBeInTheDocument();
  });

  it("calls onConfirm when the user accepts the confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DiscardDraftButton onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Clear form" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onConfirm when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DiscardDraftButton onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Clear form" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
