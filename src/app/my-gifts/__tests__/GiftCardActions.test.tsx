import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MY_GIFTS_PAGE_DEFAULTS } from "@/data/defaults";
import type { GiftStatus } from "@/lib/booking/giftStatus";
import type { SubmissionRecord } from "@/lib/booking/submissions";

import { GiftCardActions } from "../GiftCardActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}));

const baseGift: SubmissionRecord = {
  _id: "sub_gift_1",
  status: "paid",
  email: "purchaser@example.com",
  responses: [
    {
      fieldKey: "recipient_name",
      fieldLabelSnapshot: "Recipient name",
      fieldType: "text",
      value: "Sky",
    },
  ],
  recipientEmail: "sky@example.com",
  giftSendAt: "2026-12-01T17:00:00.000Z",
  giftDeliveryMethod: "scheduled",
  isGift: true,
  purchaserUserId: "user_purchaser",
  emailsFired: [],
  createdAt: "2026-05-01T00:00:00.000Z",
} as unknown as SubmissionRecord;

const scheduledStatus: GiftStatus = {
  kind: "scheduled",
  sendAt: "2026-12-01T17:00:00.000Z",
};

const selfSendStatus: GiftStatus = { kind: "self_send_ready", firedAt: null };

describe("GiftCardActions — JSON-fetch contract", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("scheduled: renders edit + flip CTAs, NOT plain HTML forms", () => {
    const { container, getByRole } = render(
      <GiftCardActions gift={baseGift} status={scheduledStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
    );
    // No `<form action="..."` POSTing as form-encoded — that was the bug.
    const forms = container.querySelectorAll("form[action^='/api/']");
    expect(forms.length).toBe(0);
    // Both CTAs are reachable as buttons.
    expect(getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.editRecipientCtaLabel })).toBeTruthy();
    expect(getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.flipToSelfSendCtaLabel })).toBeTruthy();
  });

  it("edit-recipient: JSON-fetches the route with only-changed fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ updated: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getByRole, getByDisplayValue } = render(
      <GiftCardActions gift={baseGift} status={scheduledStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
    );
    fireEvent.click(getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.editRecipientCtaLabel }));
    fireEvent.change(getByDisplayValue("sky@example.com"), {
      target: { value: "newsky@example.com" },
    });
    fireEvent.click(getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/gifts/sub_gift_1/edit-recipient");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({ "Content-Type": "application/json" });
    const body = JSON.parse((init as RequestInit).body as string);
    // Only the changed field is in the body — name + sendAt are unchanged.
    expect(body).toEqual({ recipientEmail: "newsky@example.com" });

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("edit-recipient: does NOT refresh on 422 response (stays open so user can correct)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Invalid",
          fieldErrors: [{ field: "recipientEmail", message: "Bad email." }],
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { container, getByRole, getByDisplayValue } = render(
      <GiftCardActions gift={baseGift} status={scheduledStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
    );
    fireEvent.click(getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.editRecipientCtaLabel }));
    fireEvent.change(getByDisplayValue("sky@example.com"), { target: { value: "bad" } });
    const form = container.querySelector("form");
    if (!form) throw new Error("expected drawer form to be open");
    fireEvent.submit(form);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    // Don't refresh on validation failure — user needs to see + fix the error.
    expect(refreshMock).not.toHaveBeenCalled();
    // Drawer remains open; Cancel button still visible.
    expect(getByRole("button", { name: /cancel/i })).toBeTruthy();
  });

  it("flip-to-self-send: requires 2-stage confirm (single click does NOT fetch)", () => {
    // Mock returns a 200 Response so the post-confirm async chain doesn't
    // log an unhandled rejection — the test itself only cares about the
    // call count + URL, not the eventual outcome.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getByRole } = render(
      <GiftCardActions gift={baseGift} status={scheduledStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
    );
    fireEvent.click(getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.flipToSelfSendCtaLabel }));
    // First click only arms — no network call yet.
    expect(fetchMock).not.toHaveBeenCalled();
    // Second click triggers fetch.
    fireEvent.click(getByRole("button", { name: /tap again to confirm/i }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/gifts/sub_gift_1/cancel-auto-send");
  });

  it("resend-link: surfaces 429 as a friendly inline message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getByRole, findByRole } = render(
      <GiftCardActions gift={baseGift} status={selfSendStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
    );
    fireEvent.click(getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.resendLinkCtaLabel }));
    const alert = await findByRole("alert");
    expect(alert.textContent?.toLowerCase()).toContain("already resent");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("resend-link: refreshes the server-rendered list on 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ resent: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getByRole } = render(
      <GiftCardActions gift={baseGift} status={selfSendStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
    );
    fireEvent.click(getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.resendLinkCtaLabel }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  // Phase 5 Session 4b — GAP-2 + GAP-12 a11y bundle.
  describe("a11y (GAP-2 + GAP-12)", () => {
    it("edit-recipient drawer has a visible heading + aria-labelledby form", () => {
      const { container, getByRole } = render(
        <GiftCardActions gift={baseGift} status={scheduledStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
      );
      fireEvent.click(
        getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.editRecipientCtaLabel }),
      );
      const heading = container.querySelector("h3");
      expect(heading?.textContent).toMatch(/edit recipient/i);
      const form = container.querySelector("form");
      const headingId = heading?.getAttribute("id");
      expect(headingId).toBeTruthy();
      expect(form?.getAttribute("aria-labelledby")).toBe(headingId);
    });

    it("send-at input has matching label association via htmlFor + id", () => {
      const { container, getByRole } = render(
        <GiftCardActions gift={baseGift} status={scheduledStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
      );
      fireEvent.click(
        getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.editRecipientCtaLabel }),
      );
      const input = container.querySelector("input[type='datetime-local']");
      const inputId = input?.getAttribute("id");
      expect(inputId).toBeTruthy();
      const label = container.querySelector(`label[for='${inputId}']`);
      expect(label).toBeTruthy();
    });
  });

  // Phase 5 Session 4b — B6.22 narrow projection.
  it("accepts the narrow GiftCardData shape (no purchaser email / no financial fields)", () => {
    // Compile-time + runtime check: a record carrying ONLY the GiftCardData
    // fields renders without errors. If GiftCardActions tried to read
    // purchaser email or amountPaidCents, the call below would throw or
    // typescript would fail the build.
    const narrowGift = {
      _id: "sub_narrow_1",
      responses: [
        {
          fieldKey: "recipient_name",
          fieldLabelSnapshot: "Recipient name",
          fieldType: "text",
          value: "Sky",
        },
      ],
      recipientEmail: "sky@example.com",
      giftSendAt: "2026-12-01T17:00:00.000Z",
    };
    const { getByRole } = render(
      <GiftCardActions gift={narrowGift} status={scheduledStatus} copy={MY_GIFTS_PAGE_DEFAULTS} />,
    );
    expect(
      getByRole("button", { name: MY_GIFTS_PAGE_DEFAULTS.editRecipientCtaLabel }),
    ).toBeTruthy();
  });
});
