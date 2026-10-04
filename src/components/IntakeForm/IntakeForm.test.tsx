import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GiftModeProvider, useGiftMode } from "@/components/GiftMode/GiftModeContext";
import { GIFT_DEFAULTS } from "@/data/defaults";
import type { BookingEntry } from "@/lib/analytics";
import { BookingEntryContext } from "@/lib/intake/bookingEntryContext";
import { save as saveDraft, setLastReadingId } from "@/lib/intake/localStorageDraft";
import type { SanityFormSection } from "@/lib/sanity/types";

import { IntakeForm, type IntakeGift } from "./IntakeForm";

vi.mock("@marsidev/react-turnstile", async () => {
  const React = await import("react");
  return {
    Turnstile: React.forwardRef(function MockTurnstile(
      { onSuccess }: { onSuccess: (token: string) => void },
      ref: React.Ref<{ reset: () => void; execute: () => void }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        reset: () => {},
        execute: () => {
          onSuccess("turnstile-token-stub");
        },
      }));
      return <div data-testid="turnstile-stub" />;
    }),
  };
});

const SINGLE_PAGE_SECTIONS: SanityFormSection[] = [
  {
    _id: "sec-about",
    sectionTitle: "About You",
    fields: [
      {
        _id: "f-name",
        key: "fullName",
        label: "Full name",
        type: "shortText",
        required: true,
      },
      {
        _id: "f-email",
        key: "email",
        label: "Email",
        type: "email",
        required: true,
      },
    ],
  },
  {
    _id: "sec-consent",
    sectionTitle: "Acknowledge",
    fields: [
      {
        _id: "f-consent",
        key: "agreement",
        label: "I understand readings are non-refundable.",
        type: "checkbox",
        required: true,
      },
    ],
  },
];

const TWO_PAGE_SECTIONS: SanityFormSection[] = [
  {
    _id: "sec-page-1",
    sectionTitle: "Your details",
    fields: [
      {
        _id: "f-name",
        key: "fullName",
        label: "Full name",
        type: "shortText",
        required: true,
      },
    ],
  },
  {
    _id: "sec-page-2",
    sectionTitle: "Your email",
    pageBoundary: true,
    fields: [
      {
        _id: "f-email",
        key: "email",
        label: "Email",
        type: "email",
        required: true,
      },
      {
        _id: "f-consent",
        key: "agreement",
        label: "I understand readings are non-refundable.",
        type: "checkbox",
        required: true,
      },
    ],
  },
];

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
  // Some dev shells export NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS=1 for
  // local browsing; vitest inherits and useTurnstileChallenge then
  // computes turnstileRequired=false, breaking the token-supplied
  // submit assertion below.
  vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "");
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderForm(
  sections = SINGLE_PAGE_SECTIONS,
  extra: Partial<ComponentProps<typeof IntakeForm>> = {},
  entry: BookingEntry | null = null,
) {
  render(
    <BookingEntryContext.Provider value={entry}>
      <IntakeForm
        readingId="soul-blueprint"
        readingName="Soul Blueprint"
        sections={sections}
        nonRefundableNotice="Once Josephine begins, no refunds."
        switchNotice="Switched to Soul Blueprint."
        {...extra}
      />
    </BookingEntryContext.Provider>,
  );
}

describe("IntakeForm — Clarity masking", () => {
  it("renders the form element with data-clarity-mask='True' so PII is redacted in replays", () => {
    renderForm();
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("data-clarity-mask")).toBe("True");
  });
});

describe("IntakeForm — single-page flow", () => {
  it("renders sections and the non-refundable notice above the consent block", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "About You" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acknowledge" })).toBeInTheDocument();
    expect(screen.getByText(/Once Josephine begins/)).toBeInTheDocument();
  });

  it("shows the testimonial line on the final page, above the consent block", () => {
    renderForm(SINGLE_PAGE_SECTIONS, {
      testimonial: {
        label: "From a client",
        quote: "It connected the dots.",
        name: "Raphi",
        detail: "Soul Blueprint Reading",
      },
    });
    const quote = screen.getByText(/It connected the dots./);
    expect(screen.getByText("From a client")).toBeInTheDocument();
    expect(screen.getByText("Raphi · Soul Blueprint Reading")).toBeInTheDocument();
    const consent = screen.getByText(/Once Josephine begins/);
    expect(quote.compareDocumentPosition(consent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows no testimonial line when none is set", () => {
    renderForm();
    expect(screen.queryByText("From a client")).toBeNull();
  });

  it("renders the Submit button (not Next) when form is single-page", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /Continue to payment/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Next/ })).toBeNull();
  });

  it("disables Continue while required fields are empty (bug #3)", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /Continue to payment/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("does not render a validation summary on first paint (bug #2)", () => {
    renderForm();
    expect(screen.queryByText(/still need/)).toBeNull();
  });

  it("enables submit when fields are filled and requests a fresh Turnstile token at submit time", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ paymentUrl: "https://buy.stripe.com/test", submissionId: "sub_test_123" }),
        {
          status: 200,
        },
      ),
    );
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.click(screen.getByLabelText(/processing my booking details/));
    await user.click(screen.getByLabelText(/explicitly consent/));
    await user.click(screen.getByLabelText(/non-refundable/));
    expect(screen.getByRole("button", { name: /Continue to payment/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.turnstileToken).toBe("turnstile-token-stub");
  });

  it("blocks submission when consents are incomplete — Continue stays disabled (bug #3)", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.click(screen.getByLabelText(/non-refundable/));
    // Check only the Art. 6 consent — Art. 9 deliberately left unchecked.
    await user.click(screen.getByLabelText(/processing my booking details/));
    const submit = screen.getByRole("button", { name: /Continue to payment/i });
    expect(submit).toHaveAttribute("aria-disabled", "true");
    await user.click(submit).catch(() => undefined);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("includes art6Consent and art9Consent flags in the booking POST body", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ paymentUrl: "https://buy.stripe.com/test", submissionId: "sub_test_123" }),
        {
          status: 200,
        },
      ),
    );
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.click(screen.getByLabelText(/processing my booking details/));
    await user.click(screen.getByLabelText(/explicitly consent/));
    await user.click(screen.getByLabelText(/non-refundable/));
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.art6Consent).toBe(true);
    expect(body.art9Consent).toBe(true);
  });

  it("submits and redirects to the payment URL on success", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ paymentUrl: "https://buy.stripe.com/test", submissionId: "sub_test_123" }),
        {
          status: 200,
        },
      ),
    );

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });

    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.click(screen.getByLabelText(/processing my booking details/));
    await user.click(screen.getByLabelText(/explicitly consent/));
    await user.click(screen.getByLabelText(/non-refundable/));
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/booking",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(window.location.href).toBe("https://buy.stripe.com/test");
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});

describe("IntakeForm — page 1 validation (production seed shape)", () => {
  const PROD_SHAPE: SanityFormSection[] = [
    {
      _id: "formSection-page1-system",
      sectionTitle: "Two quick details to start.",
      fields: [
        {
          _id: "formField-email",
          key: "email",
          label: "Email",
          type: "email",
          required: true,
          validation: { maxLength: 254 },
        },
        {
          _id: "formField-legalFullName",
          key: "legal_full_name",
          label: "Legal full name",
          type: "shortText",
          required: true,
          validation: { minLength: 1, maxLength: 200 },
        },
      ],
    },
    {
      _id: "formSection-photo",
      sectionTitle: "Your photo",
      pageBoundary: true,
      fields: [
        {
          _id: "formField-photo",
          key: "photo",
          label: "Photo",
          type: "fileUpload",
          required: true,
        },
      ],
    },
  ];

  function renderProdShape() {
    return render(
      <IntakeForm
        readingId="soul-blueprint"
        readingName="The Soul Blueprint"
        sections={PROD_SHAPE}
        nonRefundableNotice="..."
        switchNotice="Switched to Soul Blueprint."
      />,
    );
  }

  it("disables Next when both required fields are empty (bug #3)", () => {
    renderProdShape();
    expect(screen.getByRole("button", { name: /Next/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText(/still need/)).toBeNull();
  });

  it("keeps Next disabled when only the email is filled (bug #3)", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    expect(screen.getByRole("button", { name: /Next/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps Next disabled when only the name is filled (bug #3)", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Legal full name/), "Ada Lovelace");
    expect(screen.getByRole("button", { name: /Next/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps Next disabled when the email format is invalid (bug #3)", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Email/), "not-an-email");
    await user.type(screen.getByLabelText(/Legal full name/), "Ada Lovelace");
    expect(screen.getByRole("button", { name: /Next/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("clears the validation summary once both required fields are valid", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.type(screen.getByLabelText(/Legal full name/), "Ada Lovelace");
    expect(screen.getByRole("button", { name: /Next/ })).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("advances to page 2 when Next is clicked with valid page-1 input", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.type(screen.getByLabelText(/Legal full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "Your photo" })).toBeInTheDocument();
  });
});

describe("IntakeForm — paginated flow", () => {
  it("shows only page-1 sections initially and a Next button instead of Submit", () => {
    renderForm(TWO_PAGE_SECTIONS);
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your email" })).toBeNull();
    expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue to payment/i })).toBeNull();
  });

  it("disables Next while current-page validation is failing (bug #3)", () => {
    renderForm(TWO_PAGE_SECTIONS);
    expect(screen.getByRole("button", { name: /Next/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText(/still need/)).toBeNull();
  });

  it("advances to page 2 when current-page validation passes", async () => {
    const user = userEvent.setup();
    renderForm(TWO_PAGE_SECTIONS);
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "Your email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue to payment/i })).toBeInTheDocument();
  });

  it("returns to the previous page when Previous-page is clicked", async () => {
    const user = userEvent.setup();
    renderForm(TWO_PAGE_SECTIONS);
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    await user.click(screen.getByRole("button", { name: /Previous page/ }));
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
  });

  it("renders the review summary on the final page summarizing previous-page sections", async () => {
    const user = userEvent.setup();
    renderForm(TWO_PAGE_SECTIONS);
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByTestId("review-summary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("does not render the review summary on non-final pages", () => {
    renderForm(TWO_PAGE_SECTIONS);
    expect(screen.queryByTestId("review-summary")).not.toBeInTheDocument();
  });

  it("returns the user to the section's page when Edit is clicked from the review", async () => {
    const user = userEvent.setup();
    renderForm(TWO_PAGE_SECTIONS);
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    await user.click(screen.getByRole("button", { name: "Edit Your details" }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Ada Lovelace");
    expect(screen.queryByRole("heading", { name: "Your email" })).toBeNull();
  });
});

describe("IntakeForm — localStorage save/resume", () => {
  it("restores values from a saved draft but always resumes on the first page", async () => {
    window.localStorage.setItem(
      "josephine.intake.draft.soul-blueprint",
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        currentPage: 1,
        values: { fullName: "Ada Lovelace", email: "ada@example.com", agreement: false },
      }),
    );
    window.localStorage.setItem("josephine.intake.lastReadingId", "soul-blueprint");

    renderForm(TWO_PAGE_SECTIONS);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Your email" })).toBeNull();
    expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe("Ada Lovelace");
  });

  it.each([
    { entry: "reading_switch" as const, noticeShown: true },
    { entry: "homepage_card" as const, noticeShown: false },
    { entry: "internal" as const, noticeShown: false },
  ])(
    "carries email over and shows the switch notice only on $entry entry",
    async ({ entry, noticeShown }) => {
      saveDraft("akashic-record", { currentPage: 1, values: { email: "ada@example.com" } });
      setLastReadingId("akashic-record");

      renderForm(SINGLE_PAGE_SECTIONS, {}, entry);

      await waitFor(() => {
        expect((screen.getByLabelText(/Email/) as HTMLInputElement).value).toBe("ada@example.com");
      });
      expect(screen.queryByText(/Switched to Soul Blueprint/) !== null).toBe(noticeShown);
    },
  );

  it("does not show the Clear form button on first render with no saved draft", () => {
    renderForm();
    expect(screen.queryByTestId("discard-draft-button")).toBeNull();
  });

  it("disables Save and continue later when no fields have been touched", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /Save and continue later/ })).toBeDisabled();
  });

  it("enables Save and continue later once any field has a value", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "A");
    expect(screen.getByRole("button", { name: /Save and continue later/ })).toBeEnabled();
  });

  it("does not autosave an empty-defaults draft on mount", async () => {
    vi.useFakeTimers();
    try {
      renderForm();
      await vi.advanceTimersByTimeAsync(600);
      expect(window.localStorage.getItem("josephine.intake.draft.soul-blueprint")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the Clear form button after Save and continue later", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada");
    await user.click(screen.getByRole("button", { name: /Save and continue later/ }));
    expect(await screen.findByTestId("discard-draft-button")).toBeInTheDocument();
  });

  it("clears localStorage and resets values when Yes, clear it is confirmed", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Save and continue later/ }));
    expect(window.localStorage.getItem("josephine.intake.draft.soul-blueprint")).not.toBeNull();

    await user.click(await screen.findByTestId("discard-draft-button"));
    await user.click(await screen.findByTestId("discard-draft-confirm-yes"));

    await waitFor(() => {
      expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe("");
    });
    expect(window.localStorage.getItem("josephine.intake.draft.soul-blueprint")).toBeNull();
    expect(screen.queryByTestId("discard-draft-button")).toBeNull();
  });

  it("preserves the draft when Keep it is clicked", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Save and continue later/ }));
    const before = window.localStorage.getItem("josephine.intake.draft.soul-blueprint");
    expect(before).not.toBeNull();

    await user.click(await screen.findByTestId("discard-draft-button"));
    await user.click(await screen.findByTestId("discard-draft-cancel"));

    expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe("Ada Lovelace");
    expect(window.localStorage.getItem("josephine.intake.draft.soul-blueprint")).toBe(before);
  });

  it("clears the saved draft when /api/booking returns 2xx", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ paymentUrl: "https://buy.stripe.com/test", submissionId: "sub_test_123" }),
        {
          status: 200,
        },
      ),
    );
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });

    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.click(screen.getByLabelText(/processing my booking details/));
    await user.click(screen.getByLabelText(/explicitly consent/));
    await user.click(screen.getByLabelText(/non-refundable/));
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));

    await waitFor(() => {
      expect(window.location.href).toBe("https://buy.stripe.com/test");
    });
    expect(window.localStorage.getItem("josephine.intake.draft.soul-blueprint")).toBeNull();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});

const GIFT: IntakeGift = {
  code: "K7M2QX9PH4TR",
  overrides: {
    submitLabel: GIFT_DEFAULTS.sendDetailsLabel,
    loadingStateCopy: GIFT_DEFAULTS.sendingDetailsOverlay,
    pageIndicatorTagline: "a gift from Dana",
  },
  finalPage: {
    displayCode: "K7M2-QX9P-H4TR",
    codeAppliedTemplate: GIFT_DEFAULTS.codeAppliedTemplate,
    removeCodeLabel: GIFT_DEFAULTS.removeCodeLabel,
    giftFoot: "Nothing to pay. This reading is a gift from Dana.",
    openedNotice: "When you send your details, Dana gets a short email saying you opened the gift.",
  },
  errors: {
    ending: {
      gift_already_redeemed: GIFT_DEFAULTS.openedRaceError,
      gift_not_found: GIFT_DEFAULTS.notFoundHeading,
      gift_not_active: GIFT_DEFAULTS.noLongerActiveHeading,
    },
    tooManyTries: GIFT_DEFAULTS.codeTooManyTries,
  },
};

function DraftRestoredProbe() {
  return <p>{useGiftMode().draftRestored ? "draft restored" : "fresh form"}</p>;
}

function renderGiftForm(extra: Partial<ComponentProps<typeof IntakeForm>> = {}) {
  render(
    <GiftModeProvider>
      <DraftRestoredProbe />
      <IntakeForm
        readingId="soul-blueprint"
        readingName="Soul Blueprint"
        sections={SINGLE_PAGE_SECTIONS}
        nonRefundableNotice="Once Josephine begins, no refunds."
        switchNotice="Switched to Soul Blueprint."
        submitLabel="Continue to payment →"
        gift={GIFT}
        {...extra}
      />
    </GiftModeProvider>,
  );
}

async function fillSinglePage(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Full name/), "Anna Example");
  await user.type(screen.getByLabelText(/^Email/), "anna@example.com");
  await user.click(screen.getByLabelText(/processing my booking details/));
  await user.click(screen.getByLabelText(/explicitly consent/));
  await user.click(screen.getByLabelText(/non-refundable/));
}

describe("IntakeForm — gift mode final page", () => {
  it("masks the applied code row for Clarity", () => {
    renderGiftForm();

    const appliedRow = screen.getByText("K7M2-QX9P-H4TR").closest("p");
    expect(appliedRow?.getAttribute("data-clarity-mask")).toBe("True");
    expect(appliedRow?.textContent).toContain("Gift code K7M2-QX9P-H4TR applied");
  });

  it("shows the gift line and the opened notice above the Send my details button", () => {
    renderGiftForm();

    const notice = screen.getByText(/Dana gets a short email saying you opened the gift/);
    const button = screen.getByRole("button", { name: GIFT_DEFAULTS.sendDetailsLabel });
    expect(
      screen.getByText("Nothing to pay. This reading is a gift from Dana."),
    ).toBeInTheDocument();
    expect(notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Continue to payment/ })).toBeNull();
  });

  it("drops the opened notice when there is none", () => {
    renderGiftForm({
      gift: {
        ...GIFT,
        finalPage: {
          ...GIFT.finalPage,
          giftFoot: GIFT_DEFAULTS.giftFootNoBuyer,
          openedNotice: null,
        },
      },
    });

    expect(screen.getByText(GIFT_DEFAULTS.giftFootNoBuyer)).toBeInTheDocument();
    expect(screen.queryByText(/gets a short email/)).toBeNull();
  });

  it("marks the gift mode draft restored when a saved draft comes back", async () => {
    saveDraft("soul-blueprint", { currentPage: 0, values: { fullName: "Anna" } });

    renderGiftForm();

    expect(await screen.findByText("draft restored")).toBeInTheDocument();
  });

  it("leaves gift mode after a lost race: the applied row goes and the payment button comes back", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "gift_already_redeemed" }), { status: 409 }),
    );
    renderGiftForm();
    await fillSinglePage(user);

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sendDetailsLabel }));

    expect(await screen.findByText(GIFT_DEFAULTS.openedRaceError)).toBeInTheDocument();
    expect(screen.queryByText("K7M2-QX9P-H4TR")).toBeNull();
    expect(screen.getByRole("button", { name: /Continue to payment/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Anna Example");
  });
});

describe("IntakeForm - gift draft restore", () => {
  it("opens on the last page when the draft was left there with this gift's code", async () => {
    saveDraft("soul-blueprint", {
      currentPage: 1,
      values: { fullName: "Anna" },
      giftCode: GIFT.code,
    });

    renderGiftForm({ sections: TWO_PAGE_SECTIONS });

    expect(
      await screen.findByRole("button", { name: GIFT_DEFAULTS.sendDetailsLabel }),
    ).toBeInTheDocument();
  });

  it("opens on the first page when the draft was left on an earlier page", async () => {
    saveDraft("soul-blueprint", {
      currentPage: 0,
      values: { fullName: "Anna" },
      giftCode: GIFT.code,
    });

    renderGiftForm({ sections: TWO_PAGE_SECTIONS });

    expect(await screen.findByLabelText(/Full name/)).toHaveValue("Anna");
    expect(screen.queryByRole("button", { name: GIFT_DEFAULTS.sendDetailsLabel })).toBeNull();
  });
});

describe("IntakeForm - gift preview", () => {
  const originalLocation = window.location;
  const assignMock = vi.fn();

  beforeEach(() => {
    assignMock.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "", assign: assignMock },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("posts nothing on Send my details and stays on the page on Remove", async () => {
    const user = userEvent.setup();
    renderGiftForm({ preview: true });
    await fillSinglePage(user);

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sendDetailsLabel }));
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.removeCodeLabel }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });
});

describe("IntakeForm — initialPage", () => {
  it("opens on the last page once the draft restore settles", async () => {
    renderForm(TWO_PAGE_SECTIONS, { initialPage: "last" });

    expect(await screen.findByRole("button", { name: /Continue to payment/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });
});

describe("IntakeForm — gift code field", () => {
  it("sends zero requests after the code is typed and focus moves on", async () => {
    const user = userEvent.setup();
    renderForm(SINGLE_PAGE_SECTIONS, { giftCodeField: { copy: GIFT_DEFAULTS } });

    await user.type(screen.getByLabelText(GIFT_DEFAULTS.codeFieldOptionalLabel), "K7M2QX9PH4TR");
    await user.tab();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the code check on the press and not the booking", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ result: "not_found" }), { status: 200 }),
    );
    renderForm(SINGLE_PAGE_SECTIONS, { giftCodeField: { copy: GIFT_DEFAULTS } });
    await fillSinglePage(user);
    await user.type(screen.getByLabelText(GIFT_DEFAULTS.codeFieldOptionalLabel), "K7M2QX9PH4TA");

    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));

    expect(await screen.findByText(GIFT_DEFAULTS.codeNotFound)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gift/check",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
