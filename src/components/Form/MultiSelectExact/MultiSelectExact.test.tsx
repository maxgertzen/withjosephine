import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LIMIT_MESSAGE_TIMEOUT_MS } from "@/lib/booking/nameFollowup";

import { MultiSelectExact } from "./MultiSelectExact";

const OPTIONS = [
  { value: "purpose", label: "Soul Purpose", category: "Soul", categoryOrder: 1 },
  { value: "karma", label: "Karmic Patterns", category: "Soul", categoryOrder: 1 },
  { value: "love", label: "Relationships", category: "Bonds", categoryOrder: 2 },
  { value: "career", label: "Career", category: "Bonds", categoryOrder: 2 },
];

function setup(value: string[] = []) {
  const onChange = vi.fn();
  const onNameFollowupChange = vi.fn();
  render(
    <MultiSelectExact
      id="focus"
      name="focus"
      label="Focus areas"
      value={value}
      onChange={onChange}
      options={OPTIONS}
      count={3}
      onNameFollowupChange={onNameFollowupChange}
    />,
  );
  return { onChange, onNameFollowupChange };
}

describe("MultiSelectExact", () => {
  it("adds an option when clicked under the limit", async () => {
    const user = userEvent.setup();
    const { onChange } = setup([]);
    await user.click(screen.getByLabelText("Soul Purpose"));
    expect(onChange).toHaveBeenCalledWith(["purpose"]);
  });

  it("removes an option when an already-selected option is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = setup(["purpose"]);
    await user.click(screen.getByLabelText("Soul Purpose"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("softens unchecked options at the limit but keeps the selected ones interactive", () => {
    setup(["purpose", "karma", "love"]);

    const careerCard = screen.getByLabelText("Career").closest("li");
    expect(careerCard).toHaveAttribute("data-softened", "true");

    const purposeCard = screen.getByLabelText("Soul Purpose").closest("li");
    expect(purposeCard).not.toHaveAttribute("data-softened");
  });

  it("does not call onChange when a softened option is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = setup(["purpose", "karma", "love"]);
    await user.click(screen.getByLabelText("Career"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("flashes the limit message when an unchecked option is clicked at the limit", async () => {
    const user = userEvent.setup();
    setup(["purpose", "karma", "love"]);

    expect(screen.queryByText(/Three is the limit/)).toBeNull();

    const careerCheckbox = screen.getByLabelText("Career");
    await user.click(careerCheckbox);

    expect(screen.getByText(/Three is the limit/)).toBeInTheDocument();
  });

  describe("with fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("auto-dismisses the limit flash after the configured timeout", () => {
      const onChange = vi.fn();
      render(
        <MultiSelectExact
          id="focus"
          name="focus"
          label="Focus"
          value={["purpose", "karma", "love"]}
          onChange={onChange}
          options={OPTIONS}
          count={3}
        />,
      );

      act(() => {
        screen.getByLabelText("Career").click();
      });
      expect(screen.getByText(/Three is the limit/)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(LIMIT_MESSAGE_TIMEOUT_MS + 50);
      });
      expect(screen.queryByText(/Three is the limit/)).toBeNull();
    });
  });

  it("groups options into categories sorted by categoryOrder", () => {
    setup([]);
    const headings = screen.getAllByText(/^(Soul|Bonds)$/);
    expect(headings.map((el) => el.textContent)).toEqual(["Soul", "Bonds"]);
  });

  it("clears the name-followup value when an option is unselected", async () => {
    const user = userEvent.setup();
    const onNameFollowupChange = vi.fn();
    render(
      <MultiSelectExact
        id="focus"
        name="focus"
        label="Focus"
        value={["purpose"]}
        onChange={vi.fn()}
        options={[
          {
            value: "purpose",
            label: "Soul Purpose",
            nameFollowup: { enabled: true },
          },
        ]}
        count={3}
        onNameFollowupChange={onNameFollowupChange}
      />,
    );
    await user.click(screen.getByLabelText("Soul Purpose"));
    expect(onNameFollowupChange).toHaveBeenCalledWith("purpose", "");
  });
});
