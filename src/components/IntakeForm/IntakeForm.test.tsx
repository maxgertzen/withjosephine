import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SanityFormSection } from "@/lib/sanity/types";

import { IntakeForm } from "./IntakeForm";

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button
      type="button"
      data-testid="turnstile-stub"
      onClick={() => onSuccess("turnstile-token-stub")}
    >
      Verify
    </button>
  ),
}));

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
      screen.getByRole("button", { name: /Continue to Payment/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Next/ })).toBeNull();
  });

  it("blocks submission when Turnstile token is missing", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /Continue to Payment/ }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks submission and shows field errors when required fields are empty", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByTestId("turnstile-stub"));
    await user.click(screen.getByRole("button", { name: /Continue to Payment/ }));
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits and redirects to the payment URL on success", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ paymentUrl: "https://buy.stripe.com/test" }), {
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
    await user.click(screen.getByTestId("turnstile-stub"));
    await user.click(screen.getByRole("button", { name: /Continue to Payment/ }));

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

describe("IntakeForm — paginated flow", () => {
  it("shows only page-1 sections initially and a Next button instead of Submit", () => {
    renderForm(TWO_PAGE_SECTIONS);
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your email" })).toBeNull();
    expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue to Payment/ })).toBeNull();
  });

  it("blocks Next when current-page validation fails and stays on page 1", async () => {
    const user = userEvent.setup();
    renderForm(TWO_PAGE_SECTIONS);
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your email" })).toBeNull();
  });

  it("advances to page 2 when current-page validation passes", async () => {
    const user = userEvent.setup();
    renderForm(TWO_PAGE_SECTIONS);
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "Your email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue to Payment/ })).toBeInTheDocument();
  });

  it("returns to the previous page when Previous-page is clicked", async () => {
    const user = userEvent.setup();
    renderForm(TWO_PAGE_SECTIONS);
    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    await user.click(screen.getByRole("button", { name: /Previous page/ }));
    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
  });
});
