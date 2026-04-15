import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContactForm } from "./ContactForm";

const WEB3FORMS_KEY = "test-access-key";

describe("ContactForm", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_KEY", WEB3FORMS_KEY);
    vi.restoreAllMocks();
  });

  it("renders hardcoded defaults when no content is provided", () => {
    render(<ContactForm />);

    expect(screen.getByText("i\u2019d love to hear from you")).toBeInTheDocument();
    expect(screen.getByText(/If you have a question/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Message" })).toBeInTheDocument();
  });

  it("renders Sanity content when provided", () => {
    const content = {
      sectionTag: "\u2726 Contact Us",
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

  it("disables button when all fields are empty", () => {
    render(<ContactForm />);

    expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
  });

  it("disables button when only name is filled", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your Name"), "Jane");

    expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
  });

  it("disables button when email format is invalid", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your Name"), "Jane");
    await user.type(screen.getByLabelText("Your Email"), "not-valid");
    await user.type(screen.getByLabelText("Your Message"), "Hello");

    expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
  });

  it("disables button when message is empty", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your Name"), "Jane");
    await user.type(screen.getByLabelText("Your Email"), "jane@example.com");

    expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {})
    );

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your Name"), "Jane");
    await user.type(screen.getByLabelText("Your Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your Message"), "Hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    expect(screen.getByRole("button")).toHaveTextContent("Sending\u2026");
  });

  it("shows success message after successful submission", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your Name"), "Jane");
    await user.type(screen.getByLabelText("Your Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your Message"), "Hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(screen.getByText("message sent")).toBeInTheDocument();
    });
    expect(screen.getByText(/Thank you for reaching out/)).toBeInTheDocument();
  });

  it("shows error message after failed submission", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 })
    );

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your Name"), "Jane");
    await user.type(screen.getByLabelText("Your Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your Message"), "Hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
    });
  });

  it("shows error message on network failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your Name"), "Jane");
    await user.type(screen.getByLabelText("Your Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your Message"), "Hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Could not send your message.");
    });
  });

  it("sends correct data to Web3Forms endpoint", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Your Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your Message"), "Hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.web3forms.com/submit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            name: "Jane Doe",
            email: "jane@example.com",
            message: "Hello there",
            subject: "New message from Jane Doe",
            botcheck: "",
          }),
        })
      );
    });
  });
});
