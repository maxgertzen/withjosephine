import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sanity/ui", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Flex: passthrough,
    Stack: passthrough,
    Text: passthrough,
    Button: ({ text, onClick, disabled }: { text: string; onClick: () => void; disabled?: boolean }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {text}
      </button>
    ),
  };
});

vi.mock("sanity", () => ({ set: (value: unknown) => ({ type: "set", value }) }));

import type { NumberInputProps } from "sanity";

import { pixelSliderInput } from "./PixelSliderInput";

const PhotoSize = pixelSliderInput({
  min: 80,
  max: 200,
  step: 4,
  standard: 144,
  marks: [
    { label: "Small", px: 112 },
    { label: "Large", px: 176 },
  ],
});

function renderSlider(value?: number) {
  const onChange = vi.fn();
  const props = {
    value,
    onChange,
    readOnly: false,
    elementProps: { id: "photoSize", ref: { current: null }, onFocus: vi.fn(), onBlur: vi.fn() },
  } as unknown as NumberInputProps;
  render(<PhotoSize {...props} />);
  return onChange;
}

afterEach(() => vi.useRealTimers());

describe("PixelSliderInput", () => {
  it("shows the standard size in pixels when nothing is chosen", () => {
    renderSlider();
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("144");
    expect(screen.getByText("144 pixels")).toBeTruthy();
  });

  it("saves once, shortly after the bar stops moving", () => {
    vi.useFakeTimers();
    const onChange = renderSlider(144);
    for (const value of ["148", "152", "160"]) fireEvent.change(screen.getByRole("slider"), { target: { value } });
    expect(screen.getByText("160 pixels")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ type: "set", value: 160 });
  });

  it("jumps to a named size", () => {
    const onChange = renderSlider(144);
    fireEvent.click(screen.getByRole("button", { name: "Large" }));
    expect(onChange).toHaveBeenCalledWith({ type: "set", value: 176 });
  });
});
