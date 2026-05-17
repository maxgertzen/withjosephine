import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ART6_CONSENT_LABEL,
  ART9_CONSENT_LABEL,
  COOLING_OFF_CONSENT_LABEL,
  emptyConsentSnapshot,
} from "@/lib/compliance/intakeConsent";

import { LegalAcknowledgments } from "./LegalAcknowledgments";

const noticeText = "Readings are non-refundable. Please review your answers before paying.";

function renderHarness(overrides: Partial<Parameters<typeof LegalAcknowledgments>[0]> = {}) {
  const setSnapshot = vi.fn();
  const clearError = vi.fn();
  const props: Parameters<typeof LegalAcknowledgments>[0] = {
    snapshot: emptyConsentSnapshot(),
    setSnapshot,
    errors: {},
    clearError,
    nonRefundableNotice: noticeText,
    isSubmitting: false,
    ...overrides,
  };
  return { ...render(<LegalAcknowledgments {...props} />), setSnapshot, clearError };
}

describe("LegalAcknowledgments", () => {
  it("renders the non-refundable notice and all three acknowledgments", () => {
    renderHarness();
    expect(screen.getByText(noticeText)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: new RegExp(ART6_CONSENT_LABEL.slice(0, 30)) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: new RegExp(ART9_CONSENT_LABEL.slice(0, 30)) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: new RegExp(COOLING_OFF_CONSENT_LABEL.slice(0, 30)),
      }),
    ).toBeInTheDocument();
  });

  it("renders unconditionally — no Sanity field props required", () => {
    renderHarness();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("emits a structural snapshot update when the user toggles art6", async () => {
    const user = userEvent.setup();
    const { setSnapshot } = renderHarness();
    await user.click(
      screen.getByRole("checkbox", { name: new RegExp(ART6_CONSENT_LABEL.slice(0, 30)) }),
    );
    expect(setSnapshot).toHaveBeenCalledTimes(1);
    const next = setSnapshot.mock.calls[0]![0];
    expect(next.art6.acknowledged).toBe(true);
    expect(next.art9.acknowledged).toBe(false);
    expect(next.coolingOff.acknowledged).toBe(false);
  });

  it("emits a structural snapshot update when the user toggles cooling-off", async () => {
    const user = userEvent.setup();
    const { setSnapshot } = renderHarness();
    await user.click(
      screen.getByRole("checkbox", {
        name: new RegExp(COOLING_OFF_CONSENT_LABEL.slice(0, 30)),
      }),
    );
    expect(setSnapshot).toHaveBeenCalledTimes(1);
    expect(setSnapshot.mock.calls[0]![0].coolingOff.acknowledged).toBe(true);
  });

  it("surfaces per-checkbox errors when supplied", () => {
    renderHarness({
      errors: {
        art6: "Please acknowledge to continue.",
        coolingOff: "Please acknowledge to continue.",
      },
    });
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    alerts.forEach((alert) => {
      expect(alert).toHaveTextContent("Please acknowledge to continue.");
    });
  });

  it("clears the error when a previously-errored checkbox is checked", async () => {
    const user = userEvent.setup();
    const { clearError } = renderHarness({
      errors: { art9: "Please acknowledge to continue." },
    });
    await user.click(
      screen.getByRole("checkbox", { name: new RegExp(ART9_CONSENT_LABEL.slice(0, 30)) }),
    );
    expect(clearError).toHaveBeenCalledWith("art9");
  });

  it("disables all checkboxes while isSubmitting=true", () => {
    renderHarness({ isSubmitting: true });
    for (const cb of screen.getAllByRole("checkbox")) {
      expect(cb).toBeDisabled();
    }
  });
});
