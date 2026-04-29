import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SanityFormFieldOption } from "@/lib/sanity/types";

import { QuestionCard } from "./QuestionCard";

function baseProps(overrides: Partial<React.ComponentProps<typeof QuestionCard>> = {}) {
  const option: SanityFormFieldOption = {
    value: "soul_purpose",
    label: "What is my soul purpose in this lifetime?",
    category: "Soul Purpose",
  };
  return {
    option,
    fieldId: "field-questions",
    fieldName: "questions",
    checked: false,
    softened: false,
    onToggle: vi.fn(),
    nameFollowupValue: "",
    onNameFollowupChange: vi.fn(),
    ...overrides,
  } as React.ComponentProps<typeof QuestionCard>;
}

describe("QuestionCard", () => {
  it("renders the option label inside a checkbox label", () => {
    render(<QuestionCard {...baseProps()} />);
    expect(
      screen.getByLabelText(/What is my soul purpose in this lifetime\?/),
    ).toBeInTheDocument();
  });

  it("calls onToggle when the checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(<QuestionCard {...baseProps({ onToggle })} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("hides the name-followup input when option has no followup", () => {
    render(<QuestionCard {...baseProps({ checked: true })} />);
    expect(screen.queryByLabelText(/Their name/)).toBeNull();
  });

  it("hides the name-followup input when option has followup but is unchecked", () => {
    render(
      <QuestionCard
        {...baseProps({
          option: {
            value: "rel_contract",
            label: "What is the nature of my soul contract?",
            nameFollowup: { enabled: true, label: "Their name" },
          },
        })}
      />,
    );
    expect(screen.queryByLabelText(/Their name/)).toBeNull();
  });

  it("shows the name-followup input when option has followup and is checked", () => {
    render(
      <QuestionCard
        {...baseProps({
          checked: true,
          option: {
            value: "rel_contract",
            label: "What is the nature of my soul contract?",
            nameFollowup: { enabled: true, label: "Their name", placeholder: "Daniel" },
          },
        })}
      />,
    );
    expect(screen.getByLabelText("Their name")).toBeInTheDocument();
  });

  it("calls onNameFollowupChange when typing in the followup input", () => {
    const onNameFollowupChange = vi.fn();
    render(
      <QuestionCard
        {...baseProps({
          checked: true,
          onNameFollowupChange,
          option: {
            value: "rel_contract",
            label: "What is the nature of my soul contract?",
            nameFollowup: { enabled: true, label: "Their name" },
          },
        })}
      />,
    );
    fireEvent.change(screen.getByLabelText("Their name"), {
      target: { value: "Daniel" },
    });
    expect(onNameFollowupChange).toHaveBeenCalledWith("Daniel");
  });

  it("truncates the followup value at 80 characters", () => {
    const onNameFollowupChange = vi.fn();
    const long = "x".repeat(120);
    render(
      <QuestionCard
        {...baseProps({
          checked: true,
          onNameFollowupChange,
          option: {
            value: "rel_contract",
            label: "What is the nature of my soul contract?",
            nameFollowup: { enabled: true, label: "Their name" },
          },
        })}
      />,
    );
    fireEvent.change(screen.getByLabelText("Their name"), { target: { value: long } });
    expect(onNameFollowupChange).toHaveBeenCalledWith("x".repeat(80));
  });

  it("marks softened cards via data-softened and keeps the checkbox keyboard reachable", () => {
    render(<QuestionCard {...baseProps({ softened: true })} />);
    const li = screen.getByRole("checkbox").closest("li");
    expect(li).toHaveAttribute("data-softened", "true");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("checkbox")).toHaveAttribute("tabindex", "0");
  });
});
