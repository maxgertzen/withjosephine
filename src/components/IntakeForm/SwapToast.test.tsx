import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SwapToast } from "./SwapToast";

describe("SwapToast", () => {
  it("interpolates the reading name into the default template", () => {
    render(<SwapToast readingName="Birth Chart Reading" />);
    expect(
      screen.getByText(/Switched to Birth Chart Reading\./),
    ).toBeInTheDocument();
  });

  it("declares role=status and aria-live=polite", () => {
    render(<SwapToast readingName="Soul Blueprint" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("renders a dismiss button that hides the toast and calls onDismiss", () => {
    const onDismiss = vi.fn();
    render(<SwapToast readingName="Soul Blueprint" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/ }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  describe("with fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("auto-dismisses after the default 4-second window", () => {
      render(<SwapToast readingName="Soul Blueprint" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(4001);
      });
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("auto-dismisses after a custom duration", () => {
      render(<SwapToast readingName="Soul Blueprint" durationMs={1500} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(1501);
      });
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
