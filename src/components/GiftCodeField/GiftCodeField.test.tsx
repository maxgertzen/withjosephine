import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";

import { GiftCodeField, type GiftCodeFieldProps } from "./GiftCodeField";

const FIELD_PROPS = {
  id: "intake-gift-code",
  label: GIFT_DEFAULTS.codeFieldOptionalLabel,
  checkingLabel: GIFT_DEFAULTS.codeChecking,
  value: "",
  checking: false,
};

function renderField(overrides: Partial<GiftCodeFieldProps> = {}) {
  const onChange = vi.fn();
  render(<GiftCodeField {...FIELD_PROPS} onChange={onChange} {...overrides} />);
  return { onChange };
}

function field() {
  return screen.getByLabelText(GIFT_DEFAULTS.codeFieldOptionalLabel);
}

describe("GiftCodeField", () => {
  it("is labelled as optional and masked for Clarity", () => {
    renderField();
    expect(field().closest("[data-clarity-mask]")).toHaveAttribute("data-clarity-mask", "True");
  });

  it("uses the code letter spacing", () => {
    renderField();
    expect(field()).toHaveClass("tabular-nums");
  });

  it("shows Checking only while checking", () => {
    const { rerender } = render(
      <GiftCodeField {...FIELD_PROPS} value="K7M2" onChange={vi.fn()} checking />,
    );
    expect(screen.getByText(GIFT_DEFAULTS.codeChecking)).toBeInTheDocument();

    rerender(<GiftCodeField {...FIELD_PROPS} value="K7M2" onChange={vi.fn()} checking={false} />);
    expect(screen.queryByText(GIFT_DEFAULTS.codeChecking)).not.toBeInTheDocument();
  });

  it("shows the error and marks the field invalid", () => {
    renderField({ error: GIFT_DEFAULTS.codeNotFound });
    expect(screen.getByRole("alert")).toHaveTextContent(GIFT_DEFAULTS.codeNotFound);
    expect(field()).toHaveAttribute("aria-invalid", "true");
  });

  it("reports typing without posting anything", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    const { onChange } = renderField();
    await user.type(field(), "K");
    await user.tab();
    expect(onChange).toHaveBeenCalledWith("K");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  describe("with an Apply button", () => {
    const apply = () => ({ label: GIFT_DEFAULTS.codeApplyLabel, onApply: vi.fn() });
    const button = () => screen.getByRole("button", { name: GIFT_DEFAULTS.codeApplyLabel });

    it("redeems the typed code from the button", async () => {
      const redeem = apply();
      renderField({ value: "K7M2-AAAA-BBBB", apply: redeem });

      await userEvent.click(button());

      expect(redeem.onApply).toHaveBeenCalledOnce();
    });

    it("redeems the typed code on Enter", async () => {
      const redeem = apply();
      renderField({ value: "K7M2-AAAA-BBBB", apply: redeem });

      field().focus();
      await userEvent.keyboard("{Enter}");

      expect(redeem.onApply).toHaveBeenCalledOnce();
    });

    it("redeems once when Enter is pressed on the button itself", async () => {
      const redeem = apply();
      renderField({ value: "K7M2-AAAA-BBBB", apply: redeem });

      button().focus();
      await userEvent.keyboard("{Enter}");

      expect(redeem.onApply).toHaveBeenCalledOnce();
    });

    it("waits for a code, and for a check already running", () => {
      const { rerender } = render(
        <GiftCodeField {...FIELD_PROPS} value="" onChange={vi.fn()} apply={apply()} />,
      );
      expect(button()).toBeDisabled();

      rerender(
        <GiftCodeField {...FIELD_PROPS} value="K7M2" onChange={vi.fn()} apply={apply()} checking />,
      );
      expect(button()).toBeDisabled();
    });
  });
});
