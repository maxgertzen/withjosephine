import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

let turnstileOnSuccess: ((token: string) => void) | undefined;

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
    turnstileOnSuccess = onSuccess;
    return (
      <button type="button" data-testid="turnstile-stub" onClick={() => onSuccess("turnstile-token")}>
        verify
      </button>
    );
  },
}));

import { ContactForm } from "./ContactForm";

function solveCaptcha() {
  turnstileOnSuccess?.("turnstile-token");
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    vi.restoreAllMocks();
    turnstileOnSuccess = undefined;
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
  });

  it("renders all form fields and Turnstile widget", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText("Your email")).toBeInTheDocument();
    expect(screen.getByLabelText("Your message")).toBeInTheDocument();
    expect(screen.getByTestId("turnstile-stub")).toBeInTheDocument();
  });

  it("disables submit button until Turnstile token is captured", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Your email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your message"), "Hello there");

    expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Your email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your message"), "Hello there");
    solveCaptcha();
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    expect(screen.getByRole("button", { name: /Sending/ })).toBeInTheDocument();
  });

  it("shows success message after successful submission", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Your email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your message"), "Hello there");
    solveCaptcha();
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(screen.getByText("message sent")).toBeInTheDocument();
    });
    expect(screen.getByText(/Thank you for reaching out/)).toBeInTheDocument();
  });

  it("shows error message after failed submission", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 400 }),
    );

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Your email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your message"), "Hello there");
    solveCaptcha();
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
    });
  });

  it("shows error message on network failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Your email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your message"), "Hello there");
    solveCaptcha();
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Could not send your message.");
    });
  });

  it("posts payload to /api/contact with Turnstile token", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    render(<ContactForm />);

    await user.type(screen.getByLabelText("Your name"), "Jane Doe");
    await user.type(screen.getByLabelText("Your email"), "jane@example.com");
    await user.type(screen.getByLabelText("Your message"), "Hello there");
    solveCaptcha();
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/contact",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Jane Doe",
            email: "jane@example.com",
            message: "Hello there",
            turnstileToken: "turnstile-token",
            botcheck: "",
          }),
        }),
      );
    });
  });
});
