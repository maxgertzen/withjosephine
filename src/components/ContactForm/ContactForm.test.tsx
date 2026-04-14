import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ContactForm } from "./ContactForm";

describe("ContactForm", () => {
  it("renders hardcoded defaults when no content is provided", () => {
    render(<ContactForm />);

    expect(screen.getByText("i\u2019d love to hear from you")).toBeInTheDocument();
    expect(screen.getByText(/If you have a question/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Message" })).toBeInTheDocument();
  });

  it("renders Sanity content when provided", () => {
    const content = {
      sectionTag: "✦ Contact Us",
      heading: "reach out anytime",
      description: "Custom description text here.",
      submitText: "Submit Now",
    };

    render(<ContactForm content={content} />);

    expect(screen.getByText("reach out anytime")).toBeInTheDocument();
    expect(screen.getByText("Custom description text here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Now" })).toBeInTheDocument();
    expect(screen.queryByText("Send Message")).not.toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Message")).toBeInTheDocument();
  });
});
