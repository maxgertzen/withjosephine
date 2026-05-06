import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildSubmission } from "@/test/fixtures/submission";

import { visibleText } from "./emails/test-helpers";

const sendMock = vi.fn();
const resendCtorMock = vi.fn(function () {
  return { emails: { send: sendMock } };
});
const serverTrackMock = vi.fn();

vi.mock("resend", () => ({
  Resend: resendCtorMock,
}));

vi.mock("./analytics/server", () => ({
  serverTrack: serverTrackMock,
  generateAnonymousDistinctId: vi.fn(() => "anon-test"),
}));

beforeEach(() => {
  vi.resetModules();
  sendMock.mockReset();
  resendCtorMock.mockClear();
  serverTrackMock.mockReset();
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
    const body = visibleText(args.html);
    expect(body).toContain("Birth date");
    expect(body).toContain("1990-04-12");
    expect(body).toContain("Focus areas");
    expect(body).toContain(submission.email);
    expect(body).toContain(submission.id);
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

  it("hides fileUpload + consent rows from the responses table (noise; photo shown separately)", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_n" } });
    const submission = buildSubmission({
      responses: [
        {
          fieldKey: "first_name",
          fieldLabelSnapshot: "First name",
          fieldType: "shortText",
          value: "Ada",
        },
        {
          fieldKey: "photo",
          fieldLabelSnapshot: "A photo of yourself",
          fieldType: "fileUpload",
          value: "submissions/abc/photo.jpg",
        },
        {
          fieldKey: "tob_unknown",
          fieldLabelSnapshot: "I don't know my birth time",
          fieldType: "consent",
          value: "No",
        },
      ],
    });
    const { sendNotificationToJosephine } = await import("./resend");
    await sendNotificationToJosephine(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).toContain("First name");
    expect(html).toContain("Ada");
    expect(html).not.toContain("A photo of yourself");
    expect(html).not.toContain("I don't know my birth time");
  });

  it("includes 'Amount paid' line when amountPaidDisplay is set", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_n" } });
    const submission = buildSubmission({ amountPaidDisplay: "$99.00" });
    const { sendNotificationToJosephine } = await import("./resend");
    await sendNotificationToJosephine(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).toContain("Amount paid:");
    expect(html).toContain("$99.00");
  });

  it("omits 'Amount paid' line when amountPaidDisplay is null", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_n" } });
    const submission = buildSubmission({ amountPaidDisplay: null });
    const { sendNotificationToJosephine } = await import("./resend");
    await sendNotificationToJosephine(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("Amount paid:");
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
    const body = visibleText(args.html);
    expect(body).toContain("Hi Ada,");
    expect(body).toContain(`Thank you for booking a ${submission.readingName}`);
    expect(body).toContain("intake and your payment");
    expect(body).toContain("within seven days");
    expect(body).toContain("With love");
    expect(body).toContain("Josephine");
  });

  it("renders the typographic masthead + Soul Readings eyebrow", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const { sendOrderConfirmation } = await import("./resend");
    await sendOrderConfirmation(buildSubmission());
    const html = sendMock.mock.calls[0]?.[0].html as string;
    const body = visibleText(html);
    expect(body).toContain("Josephine");
    expect(body).toContain("Soul Readings");
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

  it("renders the paid amount in the inset card when set", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission({
      readingPriceDisplay: "$129",
      amountPaidDisplay: "$99.00",
    });
    const { sendOrderConfirmation } = await import("./resend");
    await sendOrderConfirmation(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).toContain("$99.00");
    // Strikethrough lives on the thank-you page (cents-level compare); the
    // email surfaces what was paid.
    expect(html).not.toContain("text-decoration: line-through");
  });

  it("falls back to list price when amountPaidDisplay is null", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission({
      readingPriceDisplay: "$179",
      amountPaidDisplay: null,
    });
    const { sendOrderConfirmation } = await import("./resend");
    await sendOrderConfirmation(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).toContain("$179");
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
    const body = visibleText(args.html);
    expect(body).toContain("Hi Ada,");
    expect(body).toContain("sat down with your chart");
    expect(body).toContain("not going to preview anything");
    expect(body).toContain("within the next five days");
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
    const body = visibleText(args.html);
    expect(body).toContain(submission.readingName);
    expect(body).toContain("best with headphones");
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
    const body = visibleText(args.html);
    expect(body).toContain("Jane Doe");
    expect(body).toContain("jane@example.com");
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
    expect(visibleText(args.html)).toContain(submission.id);
  });

  it("returns null resendId when NOTIFICATION_EMAIL missing", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    const { sendDay7OverdueAlert } = await import("./resend");
    const result = await sendDay7OverdueAlert(buildSubmission());
    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("RESEND_DRY_RUN gate", () => {
  it("skips sending when RESEND_DRY_RUN=1 and returns null resendId", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    const { sendNotificationToJosephine } = await import("./resend");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("also gates when RESEND_DRY_RUN='true' (matches project env-flag convention)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "true");
    const { sendNotificationToJosephine } = await import("./resend");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does NOT gate when RESEND_DRY_RUN='0' or other non-flag value", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "0");
    sendMock.mockResolvedValue({ data: { id: "msg_off" } });
    const { sendNotificationToJosephine } = await import("./resend");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(result.resendId).toBe("msg_off");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("gates BEFORE the API-key check (staging without RESEND_API_KEY still logs dry-run)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    vi.stubEnv("RESEND_API_KEY", "");
    const warnSpy = vi.spyOn(console, "warn");
    const { sendNotificationToJosephine } = await import("./resend");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
    const messages = warnSpy.mock.calls.map((args) => String(args[0]));
    expect(messages.some((m) => m.includes("RESEND_DRY_RUN"))).toBe(true);
    expect(messages.some((m) => m.includes("RESEND_API_KEY"))).toBe(false);
  });

  it("redacts recipient local-part in dry-run log (PII hygiene)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    const warnSpy = vi.spyOn(console, "warn");
    const { sendOrderConfirmation } = await import("./resend");

    await sendOrderConfirmation(buildSubmission({ email: "ada@example.com" }));

    const messages = warnSpy.mock.calls.map((args) => String(args[0]));
    const dryRunLog = messages.find((m) => m.includes("RESEND_DRY_RUN"));
    expect(dryRunLog).toBeDefined();
    expect(dryRunLog).toContain("a***@example.com");
    expect(dryRunLog).not.toContain("ada@example.com");
  });

  it("does not gate when RESEND_DRY_RUN is unset (default behavior)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "");
    sendMock.mockResolvedValue({ data: { id: "msg_default" } });
    const { sendNotificationToJosephine } = await import("./resend");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(result.resendId).toBe("msg_default");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("gates sendOrderConfirmation when RESEND_DRY_RUN=1", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    const { sendOrderConfirmation } = await import("./resend");

    const result = await sendOrderConfirmation(buildSubmission());

    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("gates sendContactMessage when RESEND_DRY_RUN=1", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    const { sendContactMessage } = await import("./resend");

    const result = await sendContactMessage({
      name: "Ada",
      email: "ada@example.com",
      message: "Hi",
    });

    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("gates sendDay7Delivery when RESEND_DRY_RUN=1 (covers delivery cron path)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    const { sendDay7Delivery } = await import("./resend");

    const result = await sendDay7Delivery(
      buildSubmission(),
      "https://example.com/listen/abc",
    );

    expect(result.resendId).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("email_sent server analytics", () => {
  it("fires email_sent on real send with the right sub_type + submission_id", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission();
    const { sendOrderConfirmation } = await import("./resend");

    await sendOrderConfirmation(submission);

    expect(serverTrackMock).toHaveBeenCalledOnce();
    expect(serverTrackMock).toHaveBeenCalledWith("email_sent", {
      distinct_id: submission.id,
      sub_type: "order_confirmation",
      submission_id: submission.id,
      recipient_redacted: expect.stringContaining("***"),
      resend_id_present: true,
    });
  });

  it("uses anonymous distinct_id and null submission_id for contact_form", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_cf" } });
    const { sendContactMessage } = await import("./resend");

    await sendContactMessage({
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Hi",
    });

    expect(serverTrackMock).toHaveBeenCalledOnce();
    const call = serverTrackMock.mock.calls[0];
    expect(call?.[0]).toBe("email_sent");
    const props = call?.[1] as Record<string, unknown>;
    expect(props.sub_type).toBe("contact_form");
    expect(props.submission_id).toBeNull();
    expect(props.distinct_id).toBe("anon-test");
  });

  it("does NOT fire on RESEND_DRY_RUN", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    const submission = buildSubmission();
    const { sendOrderConfirmation } = await import("./resend");

    await sendOrderConfirmation(submission);

    expect(serverTrackMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does NOT fire when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const submission = buildSubmission();
    const { sendOrderConfirmation } = await import("./resend");

    await sendOrderConfirmation(submission);

    expect(serverTrackMock).not.toHaveBeenCalled();
  });
});
