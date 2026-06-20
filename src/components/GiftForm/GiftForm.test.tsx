import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

import { __resetPurchaserPrefillCacheForTest, GiftForm } from "./GiftForm";

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
  __resetPurchaserPrefillCacheForTest();
  window.localStorage.clear();
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

  it("locks the purchaser email to the signed-in account when prefilledEmail is set", () => {
    render(<GiftForm {...READING_PROPS} prefilledEmail="signed-in@example.com" />);
    const email = screen.getByLabelText(/your email/i);
    expect(email).toHaveValue("signed-in@example.com");
    expect(email).toHaveAttribute("readonly");
  });

  it("leaves the purchaser email editable when not signed in", () => {
    render(<GiftForm {...READING_PROPS} />);
    expect(screen.getByLabelText(/your email/i)).not.toHaveAttribute("readonly");
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

  it("Send button is disabled while the purchaser first name is empty (bug #6)", () => {
    render(<GiftForm {...READING_PROPS} />);
    const submit = screen.getByRole("button", { name: /send this gift/i });
    expect(submit).toBeDisabled();
  });

  it("surfaces 'first name required' when form is submitted while invalid", async () => {
    const { container } = render(<GiftForm {...READING_PROPS} />);
    const form = container.querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);
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
    const submit = screen.getByRole("button", { name: /send this gift/i });
    expect(submit).toBeDisabled();
    await user.click(submit).catch(() => undefined);
    expect(fetchMock).not.toHaveBeenCalled();
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
    it("wires aria-describedby + aria-invalid on errored fields after form submit", async () => {
      const { container } = render(<GiftForm {...READING_PROPS} />);
      const form = container.querySelector("form");
      if (!form) throw new Error("form not found");
      fireEvent.submit(form);

      const firstName = await screen.findByLabelText(
        new RegExp(READING_PROPS.copy.purchaserFirstNameLabel, "i"),
      );
      expect(firstName).toHaveAttribute("aria-invalid", "true");
      const describedBy = firstName.getAttribute("aria-describedby") ?? "";
      expect(describedBy).toMatch(/gift-purchaser-first-name-error/);
      const errorEl = document.getElementById("gift-purchaser-first-name-error");
      expect(errorEl?.textContent).toMatch(/first name is required/i);
    });

    it("focuses the first errored field on form submit", async () => {
      const { container } = render(<GiftForm {...READING_PROPS} />);
      const form = container.querySelector("form");
      if (!form) throw new Error("form not found");
      fireEvent.submit(form);

      const firstName = await screen.findByLabelText(
        new RegExp(READING_PROPS.copy.purchaserFirstNameLabel, "i"),
      );
      await waitFor(() => expect(document.activeElement).toBe(firstName));
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

  describe("purchaser prefill from prior intake draft", () => {
    afterEach(() => {
      window.localStorage.clear();
    });

    function seedPriorIntakeDraft(
      readingId: string,
      values: Record<string, string>,
    ): void {
      window.localStorage.setItem("josephine.intake.lastReadingId", readingId);
      window.localStorage.setItem(
        `josephine.intake.draft.${readingId}`,
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          currentPage: 0,
          values,
        }),
      );
    }

    it("prefills purchaser email and first name from prior intake draft", async () => {
      seedPriorIntakeDraft("akashic-record", {
        email: "ada@example.com",
        first_name: "Ada",
      });
      render(<GiftForm {...READING_PROPS} />);

      const purchaserEmail = await screen.findByLabelText(
        new RegExp(READING_PROPS.copy.purchaserEmailLabel, "i"),
      );
      const purchaserFirstName = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserFirstNameLabel, "i"),
      );
      await waitFor(() =>
        expect(purchaserEmail).toHaveValue("ada@example.com"),
      );
      expect(purchaserFirstName).toHaveValue("Ada");
    });

    it("does not prefill recipient fields even when prior draft has email + first_name", async () => {
      seedPriorIntakeDraft("akashic-record", {
        email: "ada@example.com",
        first_name: "Ada",
      });
      const user = userEvent.setup();
      render(<GiftForm {...READING_PROPS} />);

      const purchaserEmail = await screen.findByLabelText(
        new RegExp(READING_PROPS.copy.purchaserEmailLabel, "i"),
      );
      await waitFor(() =>
        expect(purchaserEmail).toHaveValue("ada@example.com"),
      );

      const recipientName = screen.getByLabelText(/who.+s this for/i);
      expect(recipientName).toHaveValue("");

      await user.click(
        screen.getByRole("radio", {
          name: new RegExp(READING_PROPS.copy.deliveryMethodScheduledLabel, "i"),
        }),
      );
      const recipientEmail = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.recipientEmailLabel, "i"),
      );
      expect(recipientEmail).toHaveValue("");
    });

    it("renders empty purchaser fields when no prior reading is tracked", () => {
      render(<GiftForm {...READING_PROPS} />);
      const purchaserEmail = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserEmailLabel, "i"),
      );
      const purchaserFirstName = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserFirstNameLabel, "i"),
      );
      expect(purchaserEmail).toHaveValue("");
      expect(purchaserFirstName).toHaveValue("");
    });

    it("does not overwrite a user-typed purchaser email if the user types before the effect", async () => {
      seedPriorIntakeDraft("akashic-record", { email: "ada@example.com" });
      const user = userEvent.setup();
      render(<GiftForm {...READING_PROPS} />);

      const purchaserEmail = await screen.findByLabelText(
        new RegExp(READING_PROPS.copy.purchaserEmailLabel, "i"),
      );
      await waitFor(() =>
        expect(purchaserEmail).toHaveValue("ada@example.com"),
      );

      await user.clear(purchaserEmail);
      await user.type(purchaserEmail, "betty@example.com");
      expect(purchaserEmail).toHaveValue("betty@example.com");
    });

    it("ignores a prior draft whose email is an empty string (does not prefill empty)", () => {
      seedPriorIntakeDraft("akashic-record", { email: "", first_name: "" });
      render(<GiftForm {...READING_PROPS} />);
      const purchaserEmail = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserEmailLabel, "i"),
      );
      const purchaserFirstName = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserFirstNameLabel, "i"),
      );
      expect(purchaserEmail).toHaveValue("");
      expect(purchaserFirstName).toHaveValue("");
    });

    it("does not prefill from a gift-redeem draft (cross-flow namespace isolation)", () => {
      // gift-redeem flow stores drafts under `gift-redeem.<submissionId>`, NOT
      // the canonical readingId key. Verify the purchaser-prefill path only
      // reads from the canonical key and never leaks the recipient's email
      // into the purchaser field on a subsequent gift purchase.
      window.localStorage.setItem(
        "josephine.intake.lastReadingId",
        "akashic-record",
      );
      window.localStorage.setItem(
        "josephine.intake.draft.gift-redeem.sub-recipient-1",
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          currentPage: 0,
          values: { email: "recipient@example.com", first_name: "Recipient" },
        }),
      );
      render(<GiftForm {...READING_PROPS} />);
      const purchaserEmail = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserEmailLabel, "i"),
      );
      const purchaserFirstName = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserFirstNameLabel, "i"),
      );
      expect(purchaserEmail).toHaveValue("");
      expect(purchaserFirstName).toHaveValue("");
    });

    it("user-typed value wins immediately on first render (no race window)", async () => {
      seedPriorIntakeDraft("akashic-record", { email: "ada@example.com" });
      const user = userEvent.setup();
      render(<GiftForm {...READING_PROPS} />);

      const purchaserEmail = screen.getByLabelText(
        new RegExp(READING_PROPS.copy.purchaserEmailLabel, "i"),
      );
      // Synchronously typing into the field — the prefill must already be
      // resolved (no setTimeout-style race). With useSyncExternalStore,
      // the initial render already reflects the prefill snapshot.
      await user.clear(purchaserEmail);
      await user.type(purchaserEmail, "betty@example.com");
      expect(purchaserEmail).toHaveValue("betty@example.com");
    });
  });
});
