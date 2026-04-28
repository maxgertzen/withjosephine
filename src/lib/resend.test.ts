import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SubmissionContext } from "./resend";

const sendMock = vi.fn();
const resendCtorMock = vi.fn(function () {
  return { emails: { send: sendMock } };
});

vi.mock("resend", () => ({
  Resend: resendCtorMock,
}));

const baseSubmission: SubmissionContext = {
  id: "sub_123",
  email: "client@example.com",
  readingName: "Soul Blueprint Reading",
  readingPriceDisplay: "$179",
  responses: [
    { fieldLabelSnapshot: "Birth date", fieldType: "date", value: "1990-04-12" },
    {
      fieldLabelSnapshot: "Focus areas",
      fieldType: "multiSelectExact",
      value: "Soul Purpose, Karmic Patterns, Relationships",
    },
  ],
  photoUrl: "https://images.example.com/photo.jpg",
  createdAt: "2026-04-28T16:30:00Z",
};

beforeEach(async () => {
  vi.resetModules();
  sendMock.mockReset();
  resendCtorMock.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("NOTIFICATION_EMAIL", "hello@withjosephine.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendNotificationToJosephine", () => {
  it("sends to NOTIFICATION_EMAIL with subject and HTML body containing all responses", async () => {
    sendMock.mockResolvedValue({ id: "msg_1" });
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(baseSubmission);

    expect(sendMock).toHaveBeenCalledOnce();
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("hello@withjosephine.com");
    expect(args.subject).toBe(
      `New ${baseSubmission.readingName} booking — ${baseSubmission.email}`,
    );
    expect(args.from).toMatch(/Josephine/);
    expect(args.html).toContain("Birth date");
    expect(args.html).toContain("1990-04-12");
    expect(args.html).toContain("Focus areas");
    expect(args.html).toContain(baseSubmission.email);
    expect(args.html).toContain(baseSubmission.id);
  });

  it("includes a photo link when photoUrl is set", async () => {
    sendMock.mockResolvedValue({});
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(baseSubmission);

    expect(sendMock.mock.calls[0]?.[0].html).toContain(baseSubmission.photoUrl);
  });

  it("omits the photo link when photoUrl is null", async () => {
    sendMock.mockResolvedValue({});
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine({ ...baseSubmission, photoUrl: null });

    expect(sendMock.mock.calls[0]?.[0].html).not.toContain("Photo:");
  });

  it("escapes HTML in user-provided values", async () => {
    sendMock.mockResolvedValue({});
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine({
      ...baseSubmission,
      email: 'evil"<script>alert(1)</script>@example.com',
    });

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("skips silently when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(baseSubmission);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips silently when NOTIFICATION_EMAIL is not set", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(baseSubmission);

    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendClientConfirmation", () => {
  it("sends to the client's email with a personalized subject", async () => {
    sendMock.mockResolvedValue({});
    const { sendClientConfirmation } = await import("./resend");

    await sendClientConfirmation(baseSubmission);

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe(baseSubmission.email);
    expect(args.subject).toBe(`Your ${baseSubmission.readingName} is confirmed`);
    expect(args.html).toContain(baseSubmission.readingName);
    expect(args.html).toContain("non-refundable");
    expect(args.html).toContain(baseSubmission.id);
  });

  it("does not embed the price display in the client confirmation", async () => {
    sendMock.mockResolvedValue({});
    const { sendClientConfirmation } = await import("./resend");

    await sendClientConfirmation(baseSubmission);

    expect(sendMock.mock.calls[0]?.[0].html).not.toContain(baseSubmission.readingPriceDisplay);
  });

  it("skips silently when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendClientConfirmation } = await import("./resend");

    await sendClientConfirmation(baseSubmission);

    expect(sendMock).not.toHaveBeenCalled();
  });
});
