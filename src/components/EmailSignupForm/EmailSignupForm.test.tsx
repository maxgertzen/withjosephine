import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LINKS_PAGE_EMAIL_FORM_DEFAULTS as WORDS } from "@/data/defaults";
import { SIGNUP_API_ROUTE } from "@/lib/http/routes";

import { EmailSignupForm } from "./EmailSignupForm";

const CONSENT = { consentText: "Becky's own tick box words.", privacyLinkText: "Read how" };

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function typeEmail(value: string) {
  await userEvent.type(screen.getByLabelText(WORDS.emailLabel), value);
}

describe("EmailSignupForm", () => {
  it("shows Becky's tick box words and privacy link with the box unticked", () => {
    render(<EmailSignupForm words={WORDS} newsletter={{ box: "optional", consent: CONSENT }} buttonKey="file:1" />);

    expect(screen.getByRole("checkbox", { name: /Becky's own tick box words/ })).not.toBeChecked();
    expect(screen.getByRole("link", { name: "Read how" })).toHaveAttribute("href", "/privacy");
  });

  it("sends the download request without the newsletter when the box stays unticked", async () => {
    render(<EmailSignupForm words={WORDS} newsletter={{ box: "optional", consent: CONSENT }} buttonKey="file:1" />);
    await typeEmail("ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: WORDS.submit }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(WORDS.sent));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SIGNUP_API_ROUTE);
    expect(JSON.parse(init.body)).toMatchObject({ email: "ada@example.com", wantsNewsletter: false, buttonKey: "file:1" });
  });

  it("sends the newsletter tick when the visitor ticks the box", async () => {
    render(<EmailSignupForm words={WORDS} newsletter={{ box: "optional", consent: CONSENT }} buttonKey="file:1" />);
    await typeEmail("ada@example.com");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: WORDS.submit }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).wantsNewsletter).toBe(true);
  });

  it("keeps the button off until the box is ticked when the newsletter is the whole point", async () => {
    render(<EmailSignupForm words={WORDS} newsletter={{ box: "required", consent: CONSENT }} />);
    await typeEmail("ada@example.com");

    expect(screen.getByRole("button", { name: WORDS.submit })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: WORDS.submit })).toBeEnabled();
  });

  it("says the email is not complete and sends nothing", async () => {
    render(<EmailSignupForm words={WORDS} newsletter={{ box: "optional", consent: CONSENT }} buttonKey="file:1" />);
    await typeEmail("ada@");
    await userEvent.click(screen.getByRole("button", { name: WORDS.submit }));

    expect(screen.getByRole("alert")).toHaveTextContent(WORDS.invalidEmail);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says something went wrong when the server refuses, and lets the visitor try again", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 502 }));
    render(<EmailSignupForm words={WORDS} newsletter={{ box: "optional", consent: CONSENT }} buttonKey="file:1" />);
    await typeEmail("ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: WORDS.submit }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(WORDS.failed));
    expect(screen.getByRole("button", { name: WORDS.submit })).toBeEnabled();
  });
});
