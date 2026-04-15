import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { BookingForm } from "./BookingForm";

const defaultReading = {
  subtitle: "Soul Blueprint Reading",
  price: "$179",
  stripePaymentLink: "https://buy.stripe.com/test_abc123",
};

const defaultContent = {
  emailLabel: "Your Email Address",
  emailDisclaimer: "Your email is only used for this reading.",
  paymentButtonText: "Continue to Payment",
  securityNote: "Secure checkout",
  entertainmentAcknowledgment:
    "I understand that this reading is provided for entertainment purposes only. It is not a substitute for medical, psychological, legal, or financial advice. I will not rely on it as a factual prediction or guarantee of future outcomes.",
};

describe("BookingForm", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  it("renders email input and submit button", () => {
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    expect(screen.getByLabelText("Your Email Address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to Payment" })).toBeInTheDocument();
  });

  it("renders reading subtitle and price", () => {
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    expect(screen.getByText("Soul Blueprint Reading")).toBeInTheDocument();
    expect(screen.getByText("$179")).toBeInTheDocument();
  });

  it("disables button when email is empty", () => {
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    expect(screen.getByRole("button", { name: "Continue to Payment" })).toBeDisabled();
  });

  it("disables button when email is invalid", async () => {
    const user = userEvent.setup();
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    await user.type(screen.getByLabelText("Your Email Address"), "not-an-email");

    expect(screen.getByRole("button", { name: "Continue to Payment" })).toBeDisabled();
  });

  it("disables button when terms checkbox is unchecked", async () => {
    const user = userEvent.setup();
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    await user.type(screen.getByLabelText("Your Email Address"), "customer@example.com");
    await user.click(screen.getByLabelText(/entertainment purposes only/i));
    await user.click(screen.getByLabelText(/Josephine may begin preparing my reading/i));

    expect(screen.getByRole("button", { name: "Continue to Payment" })).toBeDisabled();
  });

  it("disables button when entertainment acknowledgment is unchecked", async () => {
    const user = userEvent.setup();
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    await user.type(screen.getByLabelText("Your Email Address"), "customer@example.com");
    await user.click(screen.getByLabelText(/Terms of Service/i));
    await user.click(screen.getByLabelText(/Josephine may begin preparing my reading/i));

    expect(screen.getByRole("button", { name: "Continue to Payment" })).toBeDisabled();
  });

  it("disables button when cooling-off waiver is unchecked", async () => {
    const user = userEvent.setup();
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    await user.type(screen.getByLabelText("Your Email Address"), "customer@example.com");
    await user.click(screen.getByLabelText(/Terms of Service/i));
    await user.click(screen.getByLabelText(/entertainment purposes only/i));

    expect(screen.getByRole("button", { name: "Continue to Payment" })).toBeDisabled();
  });

  it("shows error and disables button when payment link is missing", () => {
    const readingWithoutLink = { ...defaultReading, stripePaymentLink: "" };
    render(<BookingForm reading={readingWithoutLink} content={defaultContent} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Payment is not available at the moment.");
    expect(screen.getByRole("button", { name: "Continue to Payment" })).toBeDisabled();
  });

  it("redirects to Stripe with prefilled email on valid submit", async () => {
    const user = userEvent.setup();
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    await user.type(screen.getByLabelText("Your Email Address"), "customer@example.com");
    await user.click(screen.getByLabelText(/Terms of Service/i));
    await user.click(screen.getByLabelText(/entertainment purposes only/i));
    await user.click(screen.getByLabelText(/Josephine may begin preparing my reading/i));
    await user.click(screen.getByRole("button", { name: "Continue to Payment" }));

    expect(window.location.href).toBe(
      "https://buy.stripe.com/test_abc123?prefilled_email=customer%40example.com"
    );
  });

  it("shows error when payment link is not a Stripe domain", async () => {
    const user = userEvent.setup();
    const maliciousReading = { ...defaultReading, stripePaymentLink: "https://evil.com/steal" };
    render(<BookingForm reading={maliciousReading} content={defaultContent} />);

    await user.type(screen.getByLabelText("Your Email Address"), "customer@example.com");
    await user.click(screen.getByLabelText(/Terms of Service/i));
    await user.click(screen.getByLabelText(/entertainment purposes only/i));
    await user.click(screen.getByLabelText(/Josephine may begin preparing my reading/i));
    await user.click(screen.getByRole("button", { name: "Continue to Payment" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid payment link. Please contact support.");
    expect(window.location.href).toBe("");
  });

  it("shows error when payment link is not https", async () => {
    const user = userEvent.setup();
    const httpReading = { ...defaultReading, stripePaymentLink: "http://buy.stripe.com/test" };
    render(<BookingForm reading={httpReading} content={defaultContent} />);

    await user.type(screen.getByLabelText("Your Email Address"), "customer@example.com");
    await user.click(screen.getByLabelText(/Terms of Service/i));
    await user.click(screen.getByLabelText(/entertainment purposes only/i));
    await user.click(screen.getByLabelText(/Josephine may begin preparing my reading/i));
    await user.click(screen.getByRole("button", { name: "Continue to Payment" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid payment link. Please contact support.");
  });

  it("shows redirecting state after valid submit", async () => {
    const user = userEvent.setup();
    render(<BookingForm reading={defaultReading} content={defaultContent} />);

    await user.type(screen.getByLabelText("Your Email Address"), "customer@example.com");
    await user.click(screen.getByLabelText(/Terms of Service/i));
    await user.click(screen.getByLabelText(/entertainment purposes only/i));
    await user.click(screen.getByLabelText(/Josephine may begin preparing my reading/i));
    await user.click(screen.getByRole("button", { name: "Continue to Payment" }));

    expect(screen.getByRole("button")).toHaveTextContent("Redirecting to payment\u2026");
  });
});
