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
    sendMock.mockResolvedValue({ data: { id: "msg_1" } });
    const submission = buildSubmission();
    const { sendNotificationToJosephine } = await import("./resend");

    const result = await sendNotificationToJosephine(submission);

    expect(result.resendId).toBe("msg_1");
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
    sendMock.mockResolvedValue({ data: { id: "msg_1" } });
    const submission = buildSubmission();
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(submission);

    expect(sendMock.mock.calls[0]?.[0].html).toContain(submission.photoUrl);
  });

  it("omits the photo URL when photoUrl is null", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_1" } });
    const submission = buildSubmission({ photoUrl: null });
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(submission);

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("https://images.example.com/photo.jpg");
  });

  it("escapes HTML in user-provided values", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_1" } });
    const submission = buildSubmission({
      email: 'evil"<script>alert(1)</script>@example.com',
    });
    const { sendNotificationToJosephine } = await import("./resend");

    await sendNotificationToJosephine(submission);

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("returns null resendId when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendNotificationToJosephine } = await import("./resend");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns null resendId when NOTIFICATION_EMAIL is not set", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    const { sendNotificationToJosephine } = await import("./resend");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendOrderConfirmation", () => {
  it("sends to client with SPEC §13.B verbatim subject and body", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission();
    const { sendOrderConfirmation } = await import("./resend");

    const result = await sendOrderConfirmation(submission);

    expect(result.resendId).toBe("msg_oc");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe(submission.email);
    expect(args.subject).toBe("Your reading is booked — here's what happens next");
    expect(args.html).toContain("Hi Ada,");
    expect(args.html).toContain(`Thank you for booking a ${submission.readingName}`);
    expect(args.html).toContain("intake and your payment");
    expect(args.html).toContain("within seven days");
    expect(args.html).toContain("With love");
    expect(args.html).toContain("Josephine");
  });

  it("renders the typographic masthead + Soul Readings eyebrow", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const { sendOrderConfirmation } = await import("./resend");
    await sendOrderConfirmation(buildSubmission());
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).toContain(">Josephine<");
    expect(html).toContain(">Soul Readings<");
  });

  it("renders the centered headline 'Your reading is booked'", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const { sendOrderConfirmation } = await import("./resend");
    await sendOrderConfirmation(buildSubmission());
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).toContain("Your reading is booked");
  });

  it("renders the booking summary inset with reading name, price, and delivery window", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission({ readingPriceDisplay: "$129" });
    const { sendOrderConfirmation } = await import("./resend");
    await sendOrderConfirmation(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).toContain("Your reading"); // eyebrow
    expect(html).toContain(submission.readingName);
    expect(html).toContain("$129");
    expect(html).toContain("Delivery within 7 days");
  });

  it("HTML-escapes firstName before injecting", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission({ firstName: '<script>x</script>' });
    const { sendOrderConfirmation } = await import("./resend");

    await sendOrderConfirmation(submission);

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("HTML-escapes readingName and readingPriceDisplay before injecting", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission({
      readingName: "Soul <Blueprint>",
      readingPriceDisplay: "$129<script>",
    });
    const { sendOrderConfirmation } = await import("./resend");
    await sendOrderConfirmation(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("Soul <Blueprint>");
    expect(html).not.toContain("$129<script>");
    expect(html).toContain("Soul &lt;Blueprint&gt;");
    expect(html).toContain("$129&lt;script&gt;");
  });

  it("returns null resendId when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendOrderConfirmation } = await import("./resend");
    const result = await sendOrderConfirmation(buildSubmission());
    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendDay2Started", () => {
  it("sends SPEC §13.C verbatim copy to client", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_d2" } });
    const submission = buildSubmission();
    const { sendDay2Started } = await import("./resend");

    const result = await sendDay2Started(submission);

    expect(result.resendId).toBe("msg_d2");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe(submission.email);
    expect(args.subject).toBe("A quick note — I've started your reading");
    expect(args.html).toContain("Hi Ada,");
    expect(args.html).toContain("sat down with your chart");
    expect(args.html).toContain("not going to preview anything");
    expect(args.html).toContain("within the next five days");
  });
});

describe("sendDay7Delivery", () => {
  it("includes the listening-page URL inside an anchor href", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_d7" } });
    const submission = buildSubmission();
    const url = "https://withjosephine.com/listen/abc123";
    const { sendDay7Delivery } = await import("./resend");

    const result = await sendDay7Delivery(submission, url);

    expect(result.resendId).toBe("msg_d7");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.subject).toBe("Your reading is ready");
    expect(args.html).toContain(`href="${url}"`);
    expect(args.html).toContain(submission.readingName);
    expect(args.html).toContain("best with headphones");
  });
});

describe("sendContactMessage", () => {
  it("sends to NOTIFICATION_EMAIL with reply-to set to the visitor's email", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_contact" } });
    const { sendContactMessage } = await import("./resend");

    const result = await sendContactMessage({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "First line\nSecond line",
    });

    expect(result.resendId).toBe("msg_contact");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("hello@withjosephine.com");
    expect(args.replyTo).toBe("jane@example.com");
    expect(args.subject).toBe("New message from Jane Doe");
    expect(args.html).toContain("Jane Doe");
    expect(args.html).toContain("jane@example.com");
    expect(args.html).toContain("First line<br/>Second line");
  });

  it("escapes HTML in name, email, and message", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_contact" } });
    const { sendContactMessage } = await import("./resend");

    await sendContactMessage({
      name: "<script>x</script>",
      email: "evil@example.com",
      message: "<img onerror=alert(1)>",
    });

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("<script>x</script>");
    expect(html).not.toContain("<img onerror=alert(1)>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });

  it("returns null resendId when NOTIFICATION_EMAIL is missing", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    const { sendContactMessage } = await import("./resend");
    const result = await sendContactMessage({
      name: "Jane",
      email: "jane@example.com",
      message: "hi",
    });
    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns null resendId when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendContactMessage } = await import("./resend");
    const result = await sendContactMessage({
      name: "Jane",
      email: "jane@example.com",
      message: "hi",
    });
    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendDay7OverdueAlert", () => {
  it("sends to NOTIFICATION_EMAIL not the client", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_d7a" } });
    const submission = buildSubmission();
    const { sendDay7OverdueAlert } = await import("./resend");

    const result = await sendDay7OverdueAlert(submission);

    expect(result.resendId).toBe("msg_d7a");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("hello@withjosephine.com");
    expect(args.to).not.toBe(submission.email);
    expect(args.subject).toContain("overdue");
    expect(args.html).toContain(submission.id);
  });

  it("returns null resendId when NOTIFICATION_EMAIL missing", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    const { sendDay7OverdueAlert } = await import("./resend");
    const result = await sendDay7OverdueAlert(buildSubmission());
    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
