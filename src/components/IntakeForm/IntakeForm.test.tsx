import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SanityFormSection } from "@/lib/sanity/types";

import { IntakeForm } from "./IntakeForm";

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
        type: "consent",
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
        type: "consent",
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
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderForm(sections = SINGLE_PAGE_SECTIONS) {
  render(
    <IntakeForm
      readingId="soul-blueprint"
      readingName="Soul Blueprint"
      sections={sections}
      nonRefundableNotice="Once Josephine begins, no refunds."
    />,
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

  it("renders the Submit button (not Next) when form is single-page", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: /Continue to payment/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Next/ })).toBeNull();
  });

  it("disables submit while required fields are empty", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /Continue to payment/i })).toBeDisabled();
  });

  it("enables submit when fields are filled and requests a fresh Turnstile token at submit time", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ paymentUrl: "https://buy.stripe.com/test", submissionId: "sub_test_123" }), {
        status: 200,
      }),
    );
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.click(screen.getByLabelText(/non-refundable/));
    expect(screen.getByRole("button", { name: /Continue to payment/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /Continue to payment/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.turnstileToken).toBe("turnstile-token-stub");
  });

  it("submits and redirects to the payment URL on success", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ paymentUrl: "https://buy.stripe.com/test", submissionId: "sub_test_123" }), {
        status: 200,
      }),
    );

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });

    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
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
      />,
    );
  }

  it("disables Next when both required fields are empty", () => {
    renderProdShape();
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("keeps Next disabled when only the email is filled", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("keeps Next disabled when only the name is filled", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Legal full name/), "Ada Lovelace");
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("keeps Next disabled when the email format is invalid", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Email/), "not-an-email");
    await user.type(screen.getByLabelText(/Legal full name/), "Ada Lovelace");
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("enables Next once both required fields are valid", async () => {
    const user = userEvent.setup();
    renderProdShape();
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
    await user.type(screen.getByLabelText(/Legal full name/), "Ada Lovelace");
    expect(screen.getByRole("button", { name: /Next/ })).toBeEnabled();
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

  it("disables Next while current-page validation is failing", () => {
    renderForm(TWO_PAGE_SECTIONS);
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
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
    expect(
      screen.getByRole("heading", { name: "Your details" }),
    ).toBeInTheDocument();
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
  it("restores values and currentPage from a saved draft on mount", async () => {
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
      expect(screen.getByRole("heading", { name: "Your email" })).toBeInTheDocument();
    });
    expect((screen.getByLabelText(/Email/) as HTMLInputElement).value).toBe("ada@example.com");
  });

  it("preserves email and name when reading slug differs from lastReadingId", async () => {
    window.localStorage.setItem(
      "josephine.intake.draft.akashic-record",
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        currentPage: 1,
        values: {
          email: "ada@example.com",
          fullName: "Ada Lovelace",
        },
      }),
    );
    window.localStorage.setItem("josephine.intake.lastReadingId", "akashic-record");

    renderForm(SINGLE_PAGE_SECTIONS);

    await waitFor(() => {
      expect((screen.getByLabelText(/Email/) as HTMLInputElement).value).toBe(
        "ada@example.com",
      );
    });
    expect(screen.getByText(/Switched to Soul Blueprint/)).toBeInTheDocument();
  });

  it("does not show the Clear form button on first render with no saved draft", () => {
    renderForm();
    expect(screen.queryByTestId("discard-draft-button")).toBeNull();
  });

  it("disables Save and continue later when no fields have been touched", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: /Save and continue later/ }),
    ).toBeDisabled();
  });

  it("enables Save and continue later once any field has a value", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "A");
    expect(
      screen.getByRole("button", { name: /Save and continue later/ }),
    ).toBeEnabled();
  });

  it("does not autosave an empty-defaults draft on mount", async () => {
    vi.useFakeTimers();
    try {
      renderForm();
      await vi.advanceTimersByTimeAsync(600);
      expect(
        window.localStorage.getItem("josephine.intake.draft.soul-blueprint"),
      ).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the Clear form button after Save and continue later", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada");
    await user.click(screen.getByRole("button", { name: /Save and continue later/ }));
    expect(
      await screen.findByTestId("discard-draft-button"),
    ).toBeInTheDocument();
  });

  it("clears localStorage and resets values when Yes, clear it is confirmed", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Save and continue later/ }));
    expect(
      window.localStorage.getItem("josephine.intake.draft.soul-blueprint"),
    ).not.toBeNull();

    await user.click(await screen.findByTestId("discard-draft-button"));
    await user.click(await screen.findByTestId("discard-draft-confirm-yes"));

    await waitFor(() => {
      expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe("");
    });
    expect(
      window.localStorage.getItem("josephine.intake.draft.soul-blueprint"),
    ).toBeNull();
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

    expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe(
      "Ada Lovelace",
    );
    expect(
      window.localStorage.getItem("josephine.intake.draft.soul-blueprint"),
    ).toBe(before);
  });

  it("clears the saved draft when /api/booking returns 2xx", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ paymentUrl: "https://buy.stripe.com/test", submissionId: "sub_test_123" }), {
        status: 200,
      }),
    );
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });

    renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/Email/), "ada@example.com");
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
