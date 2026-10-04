import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingPageShell } from "./BookingPageShell";

const READING = {
  readingTag: "Signature",
  readingName: "Soul Blueprint",
  readingPrice: "$129",
};

describe("BookingPageShell", () => {
  it("renders children inside the article content area", () => {
    const { getByText } = render(
      <BookingPageShell backHref="/back" {...READING}>
        <p>inner content</p>
      </BookingPageShell>,
    );
    expect(getByText("inner content")).toBeTruthy();
  });

  it("renders the BookingFlowHeader back link with the supplied href", () => {
    const { container } = render(
      <BookingPageShell backHref="/specific-back" {...READING}>
        <p>x</p>
      </BookingPageShell>,
    );
    const backLink = container.querySelector('a[href="/specific-back"]');
    expect(backLink).toBeTruthy();
  });

  it("passes the reading block through to the title block", () => {
    const { getByText } = render(
      <BookingPageShell backHref="/back" {...READING}>
        <p>x</p>
      </BookingPageShell>,
    );
    expect(getByText("Signature")).toBeTruthy();
    expect(getByText("Soul Blueprint")).toBeTruthy();
    expect(getByText("$129")).toBeTruthy();
  });

  it("puts the reading name h1 inside main, after the Back header", () => {
    const { container } = render(
      <BookingPageShell backHref="/back" {...READING}>
        <p>x</p>
      </BookingPageShell>,
    );
    expect(container.querySelector("main#main h1")?.textContent).toBe("Soul Blueprint");
    expect(container.querySelector("header h1")).toBeNull();
    expect(container.querySelector("header a")?.getAttribute("href")).toBe("/back");
  });

  it("uses cream outer bg, 3xl max-w, card shadow and default padding", () => {
    const { container } = render(
      <BookingPageShell backHref="/back" {...READING}>
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
      <BookingPageShell backHref="/back" outerBg="ivory" {...READING}>
        <p>x</p>
      </BookingPageShell>,
    );
    expect(container.querySelector(".bg-j-ivory")).toBeTruthy();
    expect(container.querySelector(".bg-j-cream")).toBeFalsy();
  });

  it("renders an aria-hidden inner gold border guard", () => {
    const { container } = render(
      <BookingPageShell backHref="/back" {...READING}>
        <p>x</p>
      </BookingPageShell>,
    );
    const guard = container.querySelector('[aria-hidden="true"].border-j-border-gold');
    expect(guard).toBeTruthy();
  });

  it("renders a supplied price line in place of the reading price", () => {
    const { getByText, queryByText } = render(
      <BookingPageShell backHref="/back" {...READING} priceLine={<span>A gift, already paid</span>}>
        <p>x</p>
      </BookingPageShell>,
    );
    expect(getByText("A gift, already paid")).toBeTruthy();
    expect(queryByText("$129")).toBeNull();
  });

  it("leaves out the title block when there is no reading name", () => {
    const { container } = render(
      <BookingPageShell backHref="/" readingTag="" readingName="" readingPrice="">
        <p>x</p>
      </BookingPageShell>,
    );
    expect(container.querySelector("h1")).toBeNull();
  });
});
