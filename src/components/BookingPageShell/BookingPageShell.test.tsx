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

  it("uses cream outer bg + 3xl max-w + card shadow + default content padding by default", () => {
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

  it("applies max-w-2xl when maxW='2xl'", () => {
    const { container } = render(
      <BookingPageShell backHref="/back" maxW="2xl">
        <p>x</p>
      </BookingPageShell>,
    );
    expect(container.querySelector(".max-w-2xl")).toBeTruthy();
    expect(container.querySelector(".max-w-3xl")).toBeFalsy();
  });

  it("applies shadow-j-soft when shadow='soft'", () => {
    const { container } = render(
      <BookingPageShell backHref="/back" shadow="soft">
        <p>x</p>
      </BookingPageShell>,
    );
    expect(container.querySelector(".shadow-j-soft")).toBeTruthy();
    expect(container.querySelector(".shadow-j-card")).toBeFalsy();
  });

  it("applies letter content padding when contentPadding='letter'", () => {
    const { container } = render(
      <BookingPageShell backHref="/back" contentPadding="letter">
        <p>x</p>
      </BookingPageShell>,
    );
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

  it("passes aboutLinkText through to BookingFlowHeader", () => {
    const { getByText } = render(
      <BookingPageShell backHref="/back" aboutLinkText="About Josephine">
        <p>x</p>
      </BookingPageShell>,
    );
    expect(getByText("About Josephine")).toBeTruthy();
  });
});
