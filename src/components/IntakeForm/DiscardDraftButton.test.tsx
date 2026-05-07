import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DiscardDraftButton } from "./DiscardDraftButton";

describe("DiscardDraftButton", () => {
  it("renders the idle Clear form trigger", () => {
    render(<DiscardDraftButton onConfirm={() => {}} />);
    expect(screen.getByTestId("discard-draft-button")).toHaveTextContent("Clear form");
  });

  it("morphs into Cancel + Confirm and focuses Cancel on click", async () => {
    const user = userEvent.setup();
    render(<DiscardDraftButton onConfirm={() => {}} />);
    await user.click(screen.getByTestId("discard-draft-button"));
    const cancel = await screen.findByTestId("discard-draft-cancel");
    expect(cancel).toHaveTextContent("Keep it");
    expect(cancel).toHaveFocus();
    expect(screen.getByTestId("discard-draft-confirm-yes")).toHaveTextContent(
      "Yes, clear it",
    );
  });

  it("calls onConfirm when Yes, clear it is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DiscardDraftButton onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("discard-draft-button"));
    await user.click(screen.getByTestId("discard-draft-confirm-yes"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("returns to idle state without calling onConfirm when Keep it is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DiscardDraftButton onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("discard-draft-button"));
    await user.click(screen.getByTestId("discard-draft-cancel"));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId("discard-draft-button")).toBeInTheDocument();
    expect(screen.queryByTestId("discard-draft-confirm")).toBeNull();
  });

  it("returns to idle state on Escape without calling onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DiscardDraftButton onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("discard-draft-button"));
    await user.keyboard("{Escape}");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId("discard-draft-button")).toBeInTheDocument();
  });

  it("restores focus to the trigger after Cancel", async () => {
    const user = userEvent.setup();
    render(<DiscardDraftButton onConfirm={() => {}} />);
    await user.click(screen.getByTestId("discard-draft-button"));
    await user.click(screen.getByTestId("discard-draft-cancel"));
    expect(screen.getByTestId("discard-draft-button")).toHaveFocus();
  });
});
