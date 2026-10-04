import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sheet } from "./Sheet";

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </button>
      <Sheet
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        labelledBy="sheet-title"
      >
        <h2 id="sheet-title">Gift sheet</h2>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Sheet>
    </>
  );
}

async function openSheet(onClose = vi.fn()) {
  const user = userEvent.setup();
  render(<Harness onClose={onClose} />);
  await user.click(screen.getByRole("button", { name: "Open sheet" }));
  return { user, onClose };
}

afterEach(() => {
  document.documentElement.style.overflow = "";
});

describe("Sheet", () => {
  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a labelled modal dialog", async () => {
    await openSheet();
    const dialog = screen.getByRole("dialog", { name: "Gift sheet" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus into the panel on open", async () => {
    await openSheet();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });

  it("wraps Tab from the last control to the first and back", async () => {
    const { user } = await openSheet();
    await user.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  });

  it("calls onClose on Escape", async () => {
    const { user, onClose } = await openSheet();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on a dim click", async () => {
    const { user, onClose } = await openSheet();
    await user.click(screen.getByTestId("sheet-dim"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the opener on close", async () => {
    const { user } = await openSheet();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open sheet" })).toHaveFocus();
  });

  it("locks page scroll while open", async () => {
    const { user } = await openSheet();
    expect(document.documentElement.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.documentElement.style.overflow).toBe("");
  });
});
