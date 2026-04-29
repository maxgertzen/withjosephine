import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PageNav } from "./PageNav";

describe("PageNav", () => {
  it("renders entry-page Back link as anchor on first page", () => {
    render(
      <PageNav
        isFirstPage={true}
        isFinalPage={false}
        backHref="/book/soul-blueprint"
      />,
    );

    const backLink = screen.getByRole("link", { name: /Back to reading details/ });
    expect(backLink).toHaveAttribute("href", "/book/soul-blueprint");
  });

  it("renders Previous-page button on non-first pages and calls onBack", () => {
    const onBack = vi.fn();
    render(
      <PageNav
        isFirstPage={false}
        isFinalPage={false}
        backHref="/book/soul-blueprint"
        onBack={onBack}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Previous page/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls onSaveLater when the save link is clicked", () => {
    const onSaveLater = vi.fn();
    render(
      <PageNav
        isFirstPage={true}
        isFinalPage={false}
        backHref="/book/x"
        onSaveLater={onSaveLater}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Save and continue later/ }));
    expect(onSaveLater).toHaveBeenCalledTimes(1);
  });

  it("renders a Next button (not Submit) on non-final pages", () => {
    const onNext = vi.fn();
    render(
      <PageNav
        isFirstPage={true}
        isFinalPage={false}
        backHref="/book/x"
        onNext={onNext}
      />,
    );

    const nextBtn = screen.getByRole("button", { name: /Next/ });
    expect(nextBtn).toHaveAttribute("type", "button");
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /Continue to payment/ })).toBeNull();
  });

  it("renders a Submit button only on the final page", () => {
    render(
      <PageNav
        isFirstPage={false}
        isFinalPage={true}
        backHref="/book/x"
      />,
    );

    const submitBtn = screen.getByRole("button", { name: /Continue to payment/ });
    expect(submitBtn).toHaveAttribute("type", "submit");
  });

  it("disables submit while submitting", () => {
    render(
      <PageNav
        isFirstPage={false}
        isFinalPage={true}
        backHref="/book/x"
        isSubmitting={true}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: /Submitting/ });
    expect(submitBtn).toBeDisabled();
  });

  it("renders a savedIndicator slot when provided", () => {
    render(
      <PageNav
        isFirstPage={true}
        isFinalPage={false}
        backHref="/book/x"
        savedIndicator={<span>Saved a moment ago</span>}
      />,
    );
    expect(screen.getByText(/Saved a moment ago/)).toBeInTheDocument();
  });
});
