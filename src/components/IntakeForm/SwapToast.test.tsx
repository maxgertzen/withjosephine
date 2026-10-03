import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SwapToast } from "./SwapToast";

const MESSAGE = "Switched to Birth Chart Reading. Your details are saved.";

describe("SwapToast", () => {
  it("shows the message", () => {
    render(<SwapToast message={MESSAGE} />);
    expect(screen.getByText(/Switched to Birth Chart Reading\./)).toBeInTheDocument();
  });

  it("declares role=status and aria-live=polite", () => {
    render(<SwapToast message={MESSAGE} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("renders a dismiss button that hides the toast", () => {
    render(<SwapToast message={MESSAGE} />);
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/ }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  describe("with fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("auto-dismisses after 4 seconds", () => {
      render(<SwapToast message={MESSAGE} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(4001);
      });
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
