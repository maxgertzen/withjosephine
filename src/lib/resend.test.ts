import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildSubmission } from "@/test/fixtures/submission";

const sendMock = vi.fn();
const resendCtorMock = vi.fn(function () {
  return { emails: { send: sendMock } };
});

vi.mock("resend", () => ({
  Resend: resendCtorMock,
}));

beforeEach(() => {
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
    const submission = buildSubmission();
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(submission);

    expect(sendMock).toHaveBeenCalledOnce();
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("hello@withjosephine.com");
    expect(args.subject).toContain(submission.readingName);
    expect(args.subject).toContain(submission.email);
    expect(args.html).toContain("Birth date");
    expect(args.html).toContain("1990-04-12");
    expect(args.html).toContain("Focus areas");
    expect(args.html).toContain(submission.email);
    expect(args.html).toContain(submission.id);
  });

  it("includes the photo URL when photoUrl is set", async () => {
    sendMock.mockResolvedValue({});
    const submission = buildSubmission();
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(submission);

    expect(sendMock.mock.calls[0]?.[0].html).toContain(submission.photoUrl);
  });

  it("omits the photo URL when photoUrl is null", async () => {
    sendMock.mockResolvedValue({});
    const submission = buildSubmission({ photoUrl: null });
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(submission);

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("https://images.example.com/photo.jpg");
  });

  it("escapes HTML in user-provided values", async () => {
    sendMock.mockResolvedValue({});
    const submission = buildSubmission({
      email: 'evil"<script>alert(1)</script>@example.com',
    });
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(submission);

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("skips silently when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(buildSubmission());

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips silently when NOTIFICATION_EMAIL is not set", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(buildSubmission());

    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendClientConfirmation", () => {
  it("sends to the client's email with a personalized subject and non-refundable acknowledgment", async () => {
    sendMock.mockResolvedValue({});
    const submission = buildSubmission();
    const { sendClientConfirmation } = await import("./resend");

    await sendClientConfirmation(submission);

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe(submission.email);
    expect(args.subject).toContain(submission.readingName);
    expect(args.html).toContain(submission.readingName);
    expect(args.html).toContain("non-refundable");
    expect(args.html).toContain(submission.id);
  });

  it("skips silently when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendClientConfirmation } = await import("./resend");

    await sendClientConfirmation(buildSubmission());

    expect(sendMock).not.toHaveBeenCalled();
  });
});
