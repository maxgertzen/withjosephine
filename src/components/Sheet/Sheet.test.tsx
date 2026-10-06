import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sheet, SHEET_SWIPE_CLOSE_PX } from "./Sheet";

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
    expect(screen.getByRole("button", { name: "Open sheet" })).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("locks page scroll while open", async () => {
    const { user } = await openSheet();
    expect(document.documentElement.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("slides up after it mounts", async () => {
    await openSheet();
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open"));
  });

  it("stays in the page while it slides down, then leaves", async () => {
    const { user } = await openSheet();
    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("data-state", "closed");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument(),
    );
  });

  it("closes on a touch swipe down past the threshold", async () => {
    const { onClose } = await openSheet();
    const handle = screen.getByTestId("sheet-handle");

    fireEvent.pointerDown(handle, { pointerType: "touch", clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, {
      pointerType: "touch",
      clientY: 100 + SHEET_SWIPE_CLOSE_PX + 10,
      pointerId: 1,
    });
    fireEvent.pointerUp(handle, { pointerType: "touch", pointerId: 1 });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("snaps back on a short touch swipe", async () => {
    const { onClose } = await openSheet();
    const handle = screen.getByTestId("sheet-handle");

    fireEvent.pointerDown(handle, { pointerType: "touch", clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerType: "touch", clientY: 130, pointerId: 1 });
    expect(screen.getByRole("dialog").style.transform).toBe("translateY(30px)");
    fireEvent.pointerUp(handle, { pointerType: "touch", pointerId: 1 });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").style.transform).toBe("");
  });

  it("ignores mouse drags and hides the handle on fine pointers", async () => {
    const { onClose } = await openSheet();
    const handle = screen.getByTestId("sheet-handle");

    fireEvent.pointerDown(handle, { pointerType: "mouse", clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerType: "mouse", clientY: 400, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerType: "mouse", pointerId: 1 });

    expect(onClose).not.toHaveBeenCalled();
    expect(handle).toHaveClass("hidden", "any-pointer-coarse:flex");
  });

  it("starts below the screen again when reopened after closing", async () => {
    const sheet = (open: boolean) => (
      <Sheet open={open} onClose={vi.fn()} labelledBy="sheet-title">
        <h2 id="sheet-title">Gift sheet</h2>
      </Sheet>
    );
    const { rerender } = render(sheet(true));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open"));
    rerender(sheet(false));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument(),
    );

    rerender(sheet(true));

    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "closed");
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open"));
  });
});
