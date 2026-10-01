import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingFlowHeader } from "./BookingFlowHeader";

const READING = {
  readingTag: "Signature",
  readingName: "Soul Blueprint",
  readingPrice: "$129",
};

describe("BookingFlowHeader", () => {
  it("renders a Back link with the supplied href and label", () => {
    render(<BookingFlowHeader backHref="/#reading-soul-blueprint" backLabel="Back" {...READING} />);
    const back = screen.getByRole("link", { name: /Back/ });
    expect(back).toHaveAttribute("href", "/#reading-soul-blueprint");
  });

  it("renders the reading's tag, name and price as the centre block", () => {
    render(<BookingFlowHeader backHref="/" {...READING} />);
    expect(screen.getByText("Signature")).toBeInTheDocument();
    expect(screen.getByText("Soul Blueprint")).toBeInTheDocument();
    expect(screen.getByText("$129")).toBeInTheDocument();
  });

  it("marks the reading name up as the page's only h1", () => {
    render(<BookingFlowHeader backHref="/" {...READING} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Soul Blueprint");
  });

  it("makes the reading block a label, so Back is the only link", () => {
    render(<BookingFlowHeader backHref="/" {...READING} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Soul Blueprint/ })).toBeNull();
  });

  it("no longer renders the Josephine Soul Readings wordmark", () => {
    render(<BookingFlowHeader backHref="/" {...READING} />);
    expect(screen.queryByText(/Josephine Soul Readings/)).toBeNull();
  });

  it("renders a Back-only header when no reading is supplied", () => {
    render(<BookingFlowHeader backHref="/" />);
    expect(screen.getByRole("link", { name: /Back/ })).toBeInTheDocument();
    expect(screen.queryByText("Signature")).toBeNull();
  });

  it("omits the tag and price lines when they are empty", () => {
    render(<BookingFlowHeader backHref="/" readingName="Soul Blueprint" />);
    expect(screen.getByText("Soul Blueprint")).toBeInTheDocument();
    expect(screen.queryByText("Signature")).toBeNull();
    expect(screen.queryByText("$129")).toBeNull();
  });

  it("no longer renders an account menu", () => {
    render(<BookingFlowHeader backHref="/" {...READING} />);
    expect(screen.queryByTestId("account-menu")).toBeNull();
    expect(screen.queryByRole("button", { name: /account/i })).toBeNull();
  });

  it("no longer renders an About Josephine link", () => {
    render(<BookingFlowHeader backHref="/" {...READING} />);
    expect(screen.queryByRole("link", { name: "About Josephine" })).toBeNull();
  });
});
