import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  COOLING_OFF_CONSENT_LABEL,
  emptyGiftPurchaserConsentSnapshot,
  GIFT_ART6_CONSENT_LABEL,
} from "@/lib/compliance/intakeConsent";

import { LegalAcknowledgmentsGift } from "./LegalAcknowledgmentsGift";

const noticeText = "Gifts are non-refundable once payment is complete.";

function renderHarness(
  overrides: Partial<Parameters<typeof LegalAcknowledgmentsGift>[0]> = {},
) {
  const setSnapshot = vi.fn();
  const clearError = vi.fn();
  const props: Parameters<typeof LegalAcknowledgmentsGift>[0] = {
    snapshot: emptyGiftPurchaserConsentSnapshot(),
    setSnapshot,
    errors: {},
    clearError,
    nonRefundableNotice: noticeText,
    isSubmitting: false,
    ...overrides,
  };
  return { ...render(<LegalAcknowledgmentsGift {...props} />), setSnapshot, clearError };
}

describe("LegalAcknowledgmentsGift", () => {
  it("renders the non-refundable notice + art6 + cooling-off only", () => {
    renderHarness();
    expect(screen.getByText(noticeText)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: new RegExp(GIFT_ART6_CONSENT_LABEL.slice(0, 30)) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: new RegExp(COOLING_OFF_CONSENT_LABEL.slice(0, 30)),
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("does not render an Art. 9 checkbox — purchaser does not ack special-category data", () => {
    renderHarness();
    expect(screen.queryByRole("checkbox", { name: /art\.?\s*9|sensitive/i })).toBeNull();
  });

  it("emits a structural snapshot update when the user toggles art6", async () => {
    const user = userEvent.setup();
    const { setSnapshot } = renderHarness();
    await user.click(
      screen.getByRole("checkbox", { name: new RegExp(GIFT_ART6_CONSENT_LABEL.slice(0, 30)) }),
    );
    expect(setSnapshot).toHaveBeenCalledTimes(1);
    const next = setSnapshot.mock.calls[0]![0];
    expect(next.art6.acknowledged).toBe(true);
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
      errors: { art6: "Please acknowledge to continue." },
    });
    await user.click(
      screen.getByRole("checkbox", { name: new RegExp(GIFT_ART6_CONSENT_LABEL.slice(0, 30)) }),
    );
    expect(clearError).toHaveBeenCalledWith("art6");
  });

  it("disables both checkboxes while isSubmitting=true", () => {
    renderHarness({ isSubmitting: true });
    for (const cb of screen.getAllByRole("checkbox")) {
      expect(cb).toBeDisabled();
    }
  });
});
