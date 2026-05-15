import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => {
    onSuccess?.("test-turnstile-token");
    return <div data-testid="turnstile-stub" />;
  },
}));

import { BOOKING_GIFT_FORM_DEFAULTS } from "@/data/defaults";

import { GiftForm } from "./GiftForm";

const READING_PROPS = {
  readingSlug: "soul-blueprint" as const,
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  copy: BOOKING_GIFT_FORM_DEFAULTS,
};

const originalLocation = window.location;
const assignMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, assign: assignMock },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe("GiftForm", () => {
  it("renders both delivery methods with self_send selected by default", () => {
    render(<GiftForm {...READING_PROPS} />);
    const group = screen.getByRole("radiogroup", {
      name: new RegExp(READING_PROPS.copy.deliveryMethodLabel, "i"),
    });
    const selfSend = within(group).getByRole("radio", {
      name: new RegExp(READING_PROPS.copy.deliveryMethodSelfSendLabel, "i"),
    });
    expect(selfSend).toBeChecked();
  });

  it("hides recipient email + send-at fields when self_send is selected", () => {
    render(<GiftForm {...READING_PROPS} />);
    expect(
      screen.queryByLabelText(new RegExp(READING_PROPS.copy.recipientEmailLabel, "i")),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(new RegExp(READING_PROPS.copy.sendAtSectionLabel, "i")),
    ).not.toBeInTheDocument();
  });

  it("reveals recipient email + send-at fields when scheduled is selected", async () => {
    const user = userEvent.setup();
    render(<GiftForm {...READING_PROPS} />);
    await user.click(
      screen.getByRole("radio", {
        name: new RegExp(READING_PROPS.copy.deliveryMethodScheduledLabel, "i"),
      }),
    );
    expect(
      screen.getByLabelText(new RegExp(READING_PROPS.copy.recipientEmailLabel, "i")),
    ).toBeInTheDocument();
  });

  it("requires purchaser first name on submit", async () => {
    const user = userEvent.setup();
    render(<GiftForm {...READING_PROPS} />);
    await user.click(screen.getByRole("button", { name: /send this gift/i }));
    expect(
      await screen.findByText(/first name is required/i),
    ).toBeInTheDocument();
  });

  it("renders submit verb 'Send this gift' for self_send", () => {
    render(<GiftForm {...READING_PROPS} />);
    expect(screen.getByRole("button", { name: /send this gift/i })).toBeInTheDocument();
  });

  it("renders submit verb 'Prepare this gift' for scheduled", async () => {
    const user = userEvent.setup();
    render(<GiftForm {...READING_PROPS} />);
    await user.click(
      screen.getByRole("radio", {
        name: new RegExp(READING_PROPS.copy.deliveryMethodScheduledLabel, "i"),
      }),
    );
    expect(screen.getByRole("button", { name: /prepare this gift/i })).toBeInTheDocument();
  });

  it("redirects to Stripe paymentUrl on a successful POST", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            paymentUrl: "https://buy.stripe.com/test_abc?client_reference_id=x",
            submissionId: "sub-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    render(<GiftForm {...READING_PROPS} />);
    await user.type(screen.getByLabelText(/your first name/i), "Alice");
    await user.type(screen.getByLabelText(/your email/i), "alice@example.com");
    await user.click(screen.getByLabelText(/processing my contact details/i));
    await user.click(screen.getByLabelText(/cooling-off/i));
    await user.click(screen.getByRole("button", { name: /send this gift/i }));

    await screen.findByText(new RegExp(READING_PROPS.copy.loadingStateCopy, "i"));
    expect(fetchMock).toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith(
      "https://buy.stripe.com/test_abc?client_reference_id=x",
    );
  });

  it("surfaces 422 anti-abuse cap as a tone block with the locked heading", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Too many pending gifts",
          fieldErrors: { recipientEmail: "ignored — surfaced via tone block" },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ) as never,
    );

    render(<GiftForm {...READING_PROPS} />);
    await user.click(
      screen.getByRole("radio", {
        name: new RegExp(READING_PROPS.copy.deliveryMethodScheduledLabel, "i"),
      }),
    );
    await user.type(screen.getByLabelText(/your first name/i), "Alice");
    await user.type(screen.getByLabelText(/your email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/their first name/i), "Bob");
    await user.type(screen.getByLabelText(/their email/i), "bob@example.com");
    await user.type(
      screen.getByLabelText(new RegExp(READING_PROPS.copy.sendAtCustomLabel, "i")),
      "2030-01-01T09:00",
    );
    await user.click(screen.getByLabelText(/processing my contact details/i));
    await user.click(screen.getByLabelText(/cooling-off/i));
    await user.click(screen.getByRole("button", { name: /prepare this gift/i }));

    expect(
      await screen.findByText(new RegExp(READING_PROPS.copy.antiAbuseCapHeading, "i")),
    ).toBeInTheDocument();
  });

  it("blocks submission when consents are unchecked (art6 + cooling-off both required)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<GiftForm {...READING_PROPS} />);
    await user.type(screen.getByLabelText(/your first name/i), "Alice");
    await user.type(screen.getByLabelText(/your email/i), "alice@example.com");
    // Check art6 only; leave cooling-off unchecked
    await user.click(screen.getByLabelText(/processing my contact details/i));
    await user.click(screen.getByRole("button", { name: /send this gift/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (await screen.findAllByText(/please acknowledge to continue/i))[0],
    ).toBeInTheDocument();
  });

  it("shows a soft character counter on the gift message only above the threshold", () => {
    render(<GiftForm {...READING_PROPS} />);
    const textarea = screen.getByLabelText(/a note for them/i);
    expect(screen.queryByTestId("gift-message-counter")).not.toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: "x".repeat(220) } });
    expect(screen.getByTestId("gift-message-counter")).toBeInTheDocument();
  });

  // Phase 5 Session 4b — LB-6 a11y. Closes WCAG 3.3.1 + 4.1.2 gap.
  describe("a11y (LB-6)", () => {
    it("wires aria-describedby + aria-invalid on errored fields", async () => {
      const user = userEvent.setup();
      render(<GiftForm {...READING_PROPS} />);
      await user.click(screen.getByRole("button", { name: /send this gift/i }));

      const firstName = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserFirstNameLabel, "i"),
      );
      expect(firstName).toHaveAttribute("aria-invalid", "true");
      const describedBy = firstName.getAttribute("aria-describedby") ?? "";
      expect(describedBy).toMatch(/gift-purchaser-first-name-error/);
      const errorEl = document.getElementById("gift-purchaser-first-name-error");
      expect(errorEl?.textContent).toMatch(/first name is required/i);
    });

    it("focuses the first errored field on submit", async () => {
      const user = userEvent.setup();
      render(<GiftForm {...READING_PROPS} />);
      await user.click(screen.getByRole("button", { name: /send this gift/i }));

      const firstName = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserFirstNameLabel, "i"),
      );
      expect(document.activeElement).toBe(firstName);
    });

    it("submit-button ✦ is aria-hidden", () => {
      render(<GiftForm {...READING_PROPS} />);
      const btn = screen.getByRole("button", { name: /send this gift/i });
      // The accessible name from screen-reader API does not include the
      // aria-hidden glyph. Verify the glyph is rendered with aria-hidden.
      const hiddenSpans = btn.querySelectorAll('[aria-hidden="true"]');
      expect(hiddenSpans.length).toBeGreaterThan(0);
      const text = Array.from(hiddenSpans).map((s) => s.textContent).join("");
      expect(text).toMatch(/✦/);
    });
  });
});
