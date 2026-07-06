import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingPageShell } from "./BookingPageShell";

describe("BookingPageShell", () => {
  it("renders children inside the article content area", () => {
    const { getByText } = render(
      <BookingPageShell backHref="/back">
        <p>inner content</p>
      </BookingPageShell>,
    );
    expect(getByText("inner content")).toBeTruthy();
  });

  it("renders the BookingFlowHeader back link with the supplied href", () => {
    const { container } = render(
      <BookingPageShell backHref="/specific-back">
        <p>x</p>
      </BookingPageShell>,
    );
    const backLink = container.querySelector('a[href="/specific-back"]');
    expect(backLink).toBeTruthy();
  });

  it("uses cream outer bg and the standard variant (3xl max-w, card shadow, default padding) by default", () => {
    const { container } = render(
      <BookingPageShell backHref="/back">
        <p>x</p>
      </BookingPageShell>,
    );
    expect(container.querySelector(".bg-j-cream")).toBeTruthy();
    expect(container.querySelector(".max-w-3xl")).toBeTruthy();
    expect(container.querySelector(".shadow-j-card")).toBeTruthy();
    expect(container.querySelector(".md\\:px-12")).toBeTruthy();
  });

  it("applies ivory outer bg when outerBg='ivory'", () => {
    const { container } = render(
      <BookingPageShell backHref="/back" outerBg="ivory">
        <p>x</p>
      </BookingPageShell>,
    );
    expect(container.querySelector(".bg-j-ivory")).toBeTruthy();
    expect(container.querySelector(".bg-j-cream")).toBeFalsy();
  });

  it("applies the letter variant bundle (2xl max-w + soft shadow + letter padding) when variant='letter'", () => {
    const { container } = render(
      <BookingPageShell backHref="/back" variant="letter">
        <p>x</p>
      </BookingPageShell>,
    );
    expect(container.querySelector(".max-w-2xl")).toBeTruthy();
    expect(container.querySelector(".max-w-3xl")).toBeFalsy();
    expect(container.querySelector(".shadow-j-soft")).toBeTruthy();
    expect(container.querySelector(".shadow-j-card")).toBeFalsy();
    expect(container.querySelector(".py-12")).toBeTruthy();
    expect(container.querySelector(".md\\:px-10")).toBeTruthy();
  });

  it("renders an aria-hidden inner gold border guard", () => {
    const { container } = render(
      <BookingPageShell backHref="/back">
        <p>x</p>
      </BookingPageShell>,
    );
    const guard = container.querySelector('[aria-hidden="true"].border-j-border-gold');
    expect(guard).toBeTruthy();
  });
});
