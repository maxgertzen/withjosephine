import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";
import type { GiftSendStatus } from "@/lib/gift/giftSendContract";
import { respond } from "@/test/respond";

import { GiftSendForm, type GiftSendFormProps } from "./GiftSendForm";

const TOKEN = "gift-id.mac";
const NAME_LABEL = /Their name/;
const EMAIL_LABEL = /Their email/;
const READY: GiftSendStatus = {
  state: "ready",
  buyerName: "Dana",
  hasNote: true,
  recipientName: null,
};
const ALREADY_SENT: GiftSendStatus = {
  state: "sent",
  buyerName: "Dana",
  hasNote: true,
  recipientName: "Anna",
  lastSentAt: "2026-10-03T09:00:00.000Z",
};

function renderForm(overrides: Partial<GiftSendFormProps> = {}) {
  const user = userEvent.setup();
  render(<GiftSendForm token={TOKEN} status={READY} copy={GIFT_DEFAULTS} {...overrides} />);
  return user;
}

async function fillAndSend(
  user: ReturnType<typeof userEvent.setup>,
  { name = "Anna", email = "anna@email.com" } = {},
) {
  if (name) await user.type(screen.getByLabelText(NAME_LABEL), name);
  await user.type(screen.getByLabelText(EMAIL_LABEL), email);
  await user.click(sendButton());
}

function sendButton() {
  return screen.getByRole("button", { name: GIFT_DEFAULTS.sendButtonLabel });
}

function postedBody(fetchSpy: ReturnType<typeof respond>, call = 0) {
  return JSON.parse(String(fetchSpy.mock.calls[call]?.[1]?.body));
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GiftSendForm ready", () => {
  it("starts with empty fields and the help line with the note", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: GIFT_DEFAULTS.sendHeading })).toBeVisible();
    expect(screen.getByLabelText(NAME_LABEL)).toHaveValue("");
    expect(screen.getByLabelText(EMAIL_LABEL)).toHaveValue("");
    expect(
      screen.getByText("From Dana, with your note. Sent now, from hello@withjosephine.com."),
    ).toBeVisible();
  });

  it("shows the help line without the note when the gift has none", () => {
    renderForm({ status: { ...READY, hasNote: false } });
    expect(screen.getByText("From Dana. Sent now, from hello@withjosephine.com.")).toBeVisible();
  });

  it("masks the fields for Clarity", () => {
    renderForm();
    expect(screen.getByLabelText(NAME_LABEL).closest("[data-clarity-mask]")).toHaveAttribute(
      "data-clarity-mask",
      "True",
    );
    expect(screen.getByLabelText(EMAIL_LABEL).closest("[data-clarity-mask]")).toHaveAttribute(
      "data-clarity-mask",
      "True",
    );
  });

  it("posts the token, names and expectedSendCount 0", async () => {
    const fetchSpy = respond(200, {
      state: "sent",
      recipientName: "Anna",
      lastSentAt: "2026-10-04T10:00:00.000Z",
    });
    const user = renderForm();

    await fillAndSend(user, { email: " anna@email.com " });

    expect(fetchSpy).toHaveBeenCalledWith("/api/gift/send", expect.anything());
    expect(postedBody(fetchSpy)).toEqual({
      token: TOKEN,
      expectedSendCount: 0,
      recipientName: "Anna",
      recipientEmail: "anna@email.com",
      turnstileToken: "",
    });
  });

  it("disables the button and shows the sending label during the POST", async () => {
    let finish: (response: Response) => void = () => {};
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    const user = renderForm();

    await fillAndSend(user);

    const sending = screen.getByRole("button", { name: GIFT_DEFAULTS.sendingLabel });
    expect(sending).toBeDisabled();
    finish(new Response(JSON.stringify({ error: "send_failed" }), { status: 502 }));
    expect(await screen.findByText(GIFT_DEFAULTS.sendFailedNotice)).toBeVisible();
    expect(sendButton()).toBeEnabled();
  });

  it("shows the sent card with the typed email and one resend left", async () => {
    respond(200, { state: "sent", recipientName: "Anna", lastSentAt: "2026-10-04T10:00:00.000Z" });
    const user = renderForm();

    await fillAndSend(user);

    expect(await screen.findByRole("heading", { name: "Sent to Anna" })).toBeVisible();
    expect(screen.getByText("anna@email.com · just now.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Wrong address? Fix it and send again (1 left)" }),
    ).toBeVisible();
  });

  it.each([
    ["invalid_email", GIFT_DEFAULTS.recipientEmailInvalid],
    ["own_email", GIFT_DEFAULTS.recipientEmailIsBuyer],
  ])("shows the %s error under the email field", async (code, message) => {
    respond(400, { error: "Validation failed", fieldErrors: { recipientEmail: code } });
    const user = renderForm();

    await fillAndSend(user);

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.getByLabelText(EMAIL_LABEL)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(GIFT_DEFAULTS.sendFailedNotice)).not.toBeInTheDocument();
  });

  it.each([
    ["a send failure", 502, { error: "send_failed" }],
    ["a rate limit", 429, { error: "Too many requests" }],
    ["a failed Turnstile check", 400, { error: "Verification failed" }],
    ["a server error", 500, { error: "send_failed" }],
  ])("shows the failure notice after %s", async (_label, status, body) => {
    respond(status, body);
    const user = renderForm();

    await fillAndSend(user);

    expect(await screen.findByText(GIFT_DEFAULTS.sendFailedNotice)).toBeVisible();
  });

  it("shows the failure notice when the network fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const user = renderForm();

    await fillAndSend(user);

    expect(await screen.findByText(GIFT_DEFAULTS.sendFailedNotice)).toBeVisible();
  });

  it("shows the sent twice card when a 409 says both sends are used", async () => {
    respond(409, { state: "used" });
    const user = renderForm();

    await fillAndSend(user);

    expect(
      await screen.findByRole("heading", { name: GIFT_DEFAULTS.resendUsedHeading }),
    ).toBeVisible();
    expect(screen.queryByLabelText(EMAIL_LABEL)).not.toBeInTheDocument();
  });

  it("shows the link card when the send link is no longer valid", async () => {
    respond(404, { state: "invalid" });
    const user = renderForm();

    await fillAndSend(user);

    expect(
      await screen.findByRole("heading", { name: GIFT_DEFAULTS.sendLinkInvalidHeading }),
    ).toBeVisible();
  });

  it("shows the ready heading in place of the send heading", () => {
    renderForm({ readyHeading: "Send Anna’s gift" });
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "Send Anna’s gift",
    ]);
  });

  it("goes back to the form with the failure notice when a 409 says the gift is ready", async () => {
    respond(409, { ...READY, recipientName: "Anna" });
    const user = renderForm({ status: ALREADY_SENT });

    await user.click(screen.getByRole("button", { name: /Wrong address/ }));
    await fillAndSend(user, { name: "", email: "anna@another.com" });

    expect(await screen.findByText(GIFT_DEFAULTS.sendFailedNotice)).toBeVisible();
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.sendButtonLabel })).toBeEnabled();
  });

  it("posts nothing when disabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = renderForm({ disabled: true });

    await user.type(screen.getByLabelText(NAME_LABEL), "Anna");
    await user.type(screen.getByLabelText(EMAIL_LABEL), "anna@email.com");

    expect(sendButton()).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("GiftSendForm resend", () => {
  it("reopens the form with the name kept, the email empty, and posts expectedSendCount 1", async () => {
    const fetchSpy = respond(200, {
      state: "used",
      recipientName: "Anna",
      lastSentAt: "2026-10-04T10:05:00.000Z",
    });
    const user = renderForm({ status: ALREADY_SENT, readyHeading: "Send Anna’s gift" });

    expect(screen.getByRole("heading", { name: GIFT_DEFAULTS.alreadySentHeading })).toBeVisible();
    expect(screen.getByText("Sent to Anna on 3 October 2026.")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Wrong address? Fix it and send again (1 left)" }),
    );

    expect(screen.getByRole("heading", { name: GIFT_DEFAULTS.sendHeading })).toBeVisible();
    expect(screen.getByLabelText(NAME_LABEL)).toHaveValue("Anna");
    expect(screen.getByLabelText(EMAIL_LABEL)).toHaveValue("");
    await fillAndSend(user, { name: "", email: "anna@another.com" });

    expect(postedBody(fetchSpy)).toMatchObject({ expectedSendCount: 1, recipientName: "Anna" });
    expect(await screen.findByText("anna@another.com · just now.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Wrong address/ })).not.toBeInTheDocument();
  });
});

describe("GiftSendForm after a bounced send gave the slot back", () => {
  it("shows Already sent without a name line and reopens the form with the name empty", async () => {
    const user = renderForm({ status: { ...ALREADY_SENT, recipientName: null } });

    expect(screen.getByRole("heading", { name: GIFT_DEFAULTS.alreadySentHeading })).toBeVisible();
    expect(screen.queryByText(/Sent to/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Wrong address? Fix it and send again (1 left)" }),
    );

    expect(screen.getByLabelText(NAME_LABEL)).toHaveValue("");
  });
});

describe("GiftSendForm other states", () => {
  it("shows the sent twice card with no form", () => {
    renderForm({ status: { state: "used" } });
    expect(screen.getByRole("heading", { name: GIFT_DEFAULTS.resendUsedHeading })).toBeVisible();
    expect(screen.getByText(GIFT_DEFAULTS.resendUsedBody)).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the opened card", () => {
    renderForm({ status: { state: "opened" } });
    expect(
      screen.getByRole("heading", { name: GIFT_DEFAULTS.sendPageOpenedHeadingTemplate }),
    ).toBeVisible();
    expect(screen.getByText(GIFT_DEFAULTS.sendPageOpenedBody)).toBeVisible();
  });

  it("shows the invalid link card", () => {
    renderForm({ status: { state: "invalid" } });
    expect(
      screen.getByRole("heading", { name: GIFT_DEFAULTS.sendLinkInvalidHeading }),
    ).toBeVisible();
    expect(screen.getByText(GIFT_DEFAULTS.sendLinkInvalidBody)).toBeVisible();
  });
});
