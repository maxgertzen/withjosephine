import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildSubmission } from "@/test/fixtures/submission";

import { isSandboxEmail } from "./booking/sandboxEmails";
import { visibleText } from "./emails/test-helpers";
import {
  getResendId,
  redactEmail,
  sendContactMessage,
  sendMagicLink,
  sendNotificationToJosephine,
  sendOrderConfirmation,
  sendPrivacyExportEmail,
  sendReadingDelivery,
  sendReadingOverdueAlert,
} from "./resend";

const { sendMock, resendCtorMock, serverTrackMock, headersGetMock } = vi.hoisted(() => {
  const send = vi.fn();
  return {
    sendMock: send,
    resendCtorMock: vi.fn(function () {
      return { emails: { send } };
    }),
    serverTrackMock: vi.fn(),
    headersGetMock: vi.fn<(name: string) => string | null>(() => null),
  };
});

vi.mock("resend", () => ({
  Resend: resendCtorMock,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: headersGetMock })),
}));

vi.mock("./analytics/server", () => ({
  serverTrack: serverTrackMock,
  generateAnonymousDistinctId: vi.fn(() => "anon-test"),
}));

const sanityFetchMocks = vi.hoisted(() => ({
  fetchEmailMagicLink: vi.fn(),
  fetchEmailReadingDelivery: vi.fn(),
  fetchEmailOrderConfirmation: vi.fn(),
  fetchEmailPrivacyExport: vi.fn(),
  fetchEmailSharedShell: vi.fn(),
}));

vi.mock("./sanity/fetch", () => sanityFetchMocks);

beforeEach(() => {
  for (const fetchMock of Object.values(sanityFetchMocks))
    fetchMock.mockReset().mockResolvedValue(null);
  sendMock.mockReset();
  serverTrackMock.mockReset();
  headersGetMock.mockReset().mockReturnValue(null);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("NOTIFICATION_EMAIL", "hello@withjosephine.com");
  vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendNotificationToJosephine", () => {
  it("sends to NOTIFICATION_EMAIL with subject and HTML body containing all responses", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_1" } });
    const submission = buildSubmission();

    const result = await sendNotificationToJosephine(submission);

    expect(getResendId(result)).toBe("msg_1");
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

    await sendNotificationToJosephine(submission);

    expect(sendMock.mock.calls[0]?.[0].html).toContain(submission.photoUrl);
  });

  it("omits the photo URL when photoUrl is null", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_1" } });
    const submission = buildSubmission({ photoUrl: null });

    await sendNotificationToJosephine(submission);

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("https://images.example.com/photo.jpg");
  });

  it("escapes HTML in user-provided values", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_1" } });
    const submission = buildSubmission({
      email: 'evil"<script>alert(1)</script>@example.com',
    });

    await sendNotificationToJosephine(submission);

    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("returns null resendId when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns null resendId when NOTIFICATION_EMAIL is not set", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBeNull();
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
    await sendNotificationToJosephine(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    const body = visibleText(html);
    expect(body).toContain("First name");
    expect(body).toContain("Ada");
    expect(body).not.toContain("A photo of yourself");
    expect(body).not.toContain("I don't know my birth time");
  });

  it("includes 'Amount paid' line when amountPaidDisplay is set", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_n" } });
    const submission = buildSubmission({ amountPaidDisplay: "$99.00" });
    await sendNotificationToJosephine(submission);
    const body = visibleText(sendMock.mock.calls[0]?.[0].html);
    expect(body).toContain("Amount paid:");
    expect(body).toContain("$99.00");
  });

  it("omits 'Amount paid' line when amountPaidDisplay is null", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_n" } });
    const submission = buildSubmission({ amountPaidDisplay: null });
    await sendNotificationToJosephine(submission);
    const body = visibleText(sendMock.mock.calls[0]?.[0].html);
    expect(body).not.toContain("Amount paid:");
  });
});

describe("sendOrderConfirmation", () => {
  it("sends to client with SPEC §13.B verbatim subject and body", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission();

    const result = await sendOrderConfirmation(submission);

    expect(getResendId(result)).toBe("msg_oc");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe(submission.email);
    expect(args.subject).toBe("Your reading is booked: what happens next");
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
    await sendOrderConfirmation(buildSubmission());
    const html = sendMock.mock.calls[0]?.[0].html as string;
    const body = visibleText(html);
    expect(body).toContain("Josephine");
    expect(body).toContain("Soul Readings");
  });

  it("renders the centered headline 'Your reading is booked'", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    await sendOrderConfirmation(buildSubmission());
    const body = visibleText(sendMock.mock.calls[0]?.[0].html);
    expect(body).toContain("Your reading is booked");
  });

  it("renders the booking summary inset with reading name, price, and delivery window", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission({ readingPriceDisplay: "$129" });
    await sendOrderConfirmation(submission);
    const body = visibleText(sendMock.mock.calls[0]?.[0].html);
    expect(body).toContain("Your reading"); // eyebrow
    expect(body).toContain(submission.readingName);
    expect(body).toContain("$129");
    expect(body).toContain("Delivery within 7 days");
  });

  it("renders the paid amount in the inset card when set", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission({
      readingPriceDisplay: "$129",
      amountPaidDisplay: "$99.00",
    });
    await sendOrderConfirmation(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(visibleText(html)).toContain("$99.00");
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
    await sendOrderConfirmation(submission);
    const body = visibleText(sendMock.mock.calls[0]?.[0].html);
    expect(body).toContain("$179");
  });

  it("HTML-escapes firstName before injecting", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission({ firstName: "<script>x</script>" });

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
    await sendOrderConfirmation(submission);
    const html = sendMock.mock.calls[0]?.[0].html as string;
    expect(html).not.toContain("Soul <Blueprint>");
    expect(html).not.toContain("$129<script>");
    expect(html).toContain("Soul &lt;Blueprint&gt;");
    expect(html).toContain("$129&lt;script&gt;");
  });

  it("returns null resendId when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendOrderConfirmation(buildSubmission());
    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("forwards the idempotency key to Resend for the order confirmation and Josephine notification", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });

    await sendOrderConfirmation(buildSubmission(), { idempotencyKey: "order-confirmation/sub_1" });
    await sendNotificationToJosephine(buildSubmission(), {
      idempotencyKey: "josephine-notification/sub_1",
    });

    expect(sendMock.mock.calls[0]?.[1]).toEqual({ idempotencyKey: "order-confirmation/sub_1" });
    expect(sendMock.mock.calls[1]?.[1]).toEqual({ idempotencyKey: "josephine-notification/sub_1" });
  });

  it("dispatches to the purchaser email", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc_self" } });
    const submission = buildSubmission({ email: "buyer@example.com" });

    await sendOrderConfirmation(submission);

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("buyer@example.com");
  });
});

describe("sendReadingDelivery", () => {
  it("forwards the idempotency key to Resend", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_d7" } });

    await sendReadingDelivery(buildSubmission(), "https://withjosephine.com/listen/sub_1", {
      idempotencyKey: "reading-delivery/sub_1",
    });

    expect(sendMock.mock.calls[0]?.[1]).toEqual({ idempotencyKey: "reading-delivery/sub_1" });
  });

  it("sends a byte-identical request for the same submission and listen URL", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_d7" } });
    const listenUrl = "https://withjosephine.com/listen/sub_1?t=fixed";

    await sendReadingDelivery(buildSubmission(), listenUrl, { idempotencyKey: "reading-delivery/sub_1" });
    await sendReadingDelivery(buildSubmission(), listenUrl, { idempotencyKey: "reading-delivery/sub_1" });

    expect(sendMock.mock.calls[1]).toEqual(sendMock.mock.calls[0]);
  });

  it("returns the Resend error name and status when Resend answers with an error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendMock.mockResolvedValue({
      data: null,
      error: { name: "concurrent_idempotent_requests", statusCode: 409, message: "in progress" },
    });

    const result = await sendReadingDelivery(buildSubmission(), "https://withjosephine.com/listen/sub_1", {
      idempotencyKey: "reading-delivery/sub_1",
    });

    expect(result).toEqual({
      kind: "failed",
      error: "concurrent_idempotent_requests",
      statusCode: 409,
    });
  });

  it("includes the listening-page URL inside an anchor href", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_d7" } });
    const submission = buildSubmission();
    const url = "https://withjosephine.com/listen/abc123";

    const result = await sendReadingDelivery(submission, url);

    expect(getResendId(result)).toBe("msg_d7");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.subject).toBe(`Your ${submission.readingName} reading is ready`);
    expect(args.html).toContain(`href="${url}"`);
    const body = visibleText(args.html);
    expect(body).toContain(`Your ${submission.readingName} reading is here.`);
    expect(body).toContain("Open it whenever the timing feels right");
    expect(body).toContain("signed in for the next seven days");
    expect(body).toContain("Open your reading");
  });

  it("dispatches to the purchaser email", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_d7_self" } });
    const submission = buildSubmission({ email: "buyer@example.com" });

    await sendReadingDelivery(submission, "https://withjosephine.com/listen/abc");

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("buyer@example.com");
  });
});

describe("sendPrivacyExportEmail", () => {
  it("renders Sanity-fetched copy with expiryDays interpolated", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_priv" } });
    const { stringToPortableTextBlocks } = await import("./emails/portableTextBuild");
    vi.mocked(sanityFetchMocks.fetchEmailPrivacyExport).mockResolvedValue({
      subject: "Custom export subject",
      preview: "Custom export preview",
      heroLine: "Your data export is ready",
      bodyIntro: [
        ...stringToPortableTextBlocks("Greetings,"),
        ...stringToPortableTextBlocks("Your export is queued."),
        ...stringToPortableTextBlocks("Contains your export data."),
      ],
      bodyPostButton: stringToPortableTextBlocks("Link expires in {expiryDays} days."),
      ctaLabel: "Grab your ZIP",
      signOff: null,
    });

    const result = await sendPrivacyExportEmail({
      to: "ada@example.com",
      firstName: "Ada",
      downloadUrl: "https://r2.withjosephine.com/exports/abc.zip",
      expiryDays: 14,
    });

    expect(getResendId(result)).toBe("msg_priv");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("ada@example.com");
    expect(args.subject).toBe("Custom export subject");
    const body = visibleText(args.html);
    expect(body).toContain("Contains your export data.");
    expect(body).toContain("Link expires in 14 days.");
    expect(body).toContain("Grab your ZIP");
    expect(args.html).toContain('href="https://r2.withjosephine.com/exports/abc.zip"');
  });

  it("falls back to defaults when Sanity fetch returns null", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_priv_default" } });
    vi.mocked(sanityFetchMocks.fetchEmailPrivacyExport).mockResolvedValue(null);

    await sendPrivacyExportEmail({
      to: "ada@example.com",
      firstName: "Ada",
      downloadUrl: "https://r2.withjosephine.com/exports/xyz.zip",
      expiryDays: 7,
    });

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.subject).toBe("Your Josephine data export");
    const body = visibleText(args.html);
    expect(body).toContain("for your reading");
    expect(body).toContain("expires in 7 days");
  });

  it("substitutes {firstName} in Sanity-edited copy", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_priv_first" } });
    const { stringToPortableTextBlocks } = await import("./emails/portableTextBuild");
    vi.mocked(sanityFetchMocks.fetchEmailPrivacyExport).mockResolvedValue({
      subject: "Hello {firstName}, your export is ready",
      preview: "{firstName}, the link is below",
      heroLine: "Your export is ready, {firstName}",
      bodyIntro: stringToPortableTextBlocks("Hi {firstName}, here it comes."),
      bodyPostButton: stringToPortableTextBlocks("Take care, {firstName}."),
      ctaLabel: "Download",
      signOff: null,
    });

    await sendPrivacyExportEmail({
      to: "ada@example.com",
      firstName: "Ada",
      downloadUrl: "https://r2.withjosephine.com/exports/abc.zip",
      expiryDays: 7,
    });

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.subject).toBe("Hello Ada, your export is ready");
    const body = visibleText(args.html);
    expect(body).toContain("Your export is ready, Ada");
    expect(body).toContain("Hi Ada, here it comes.");
    expect(body).toContain("Take care, Ada.");
  });

  it("renders with 'there' fallback when no firstName known", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_priv_fallback" } });
    const { stringToPortableTextBlocks } = await import("./emails/portableTextBuild");
    vi.mocked(sanityFetchMocks.fetchEmailPrivacyExport).mockResolvedValue({
      subject: "Hello {firstName}",
      preview: "Hi {firstName}",
      heroLine: "Hi {firstName}",
      bodyIntro: stringToPortableTextBlocks("Hi {firstName}."),
      bodyPostButton: stringToPortableTextBlocks("Bye {firstName}."),
      ctaLabel: "Download",
      signOff: null,
    });

    await sendPrivacyExportEmail({
      to: "ada@example.com",
      firstName: "there",
      downloadUrl: "https://r2.withjosephine.com/exports/xyz.zip",
      expiryDays: 7,
    });

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.subject).toBe("Hello there");
    const body = visibleText(args.html);
    expect(body).toContain("Hi there");
  });
});

describe("sendContactMessage", () => {
  it("sends to NOTIFICATION_EMAIL with reply-to set to the visitor's email", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_contact" } });

    const result = await sendContactMessage({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "First line\nSecond line",
    });

    expect(getResendId(result)).toBe("msg_contact");
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
    const result = await sendContactMessage({
      name: "Jane",
      email: "jane@example.com",
      message: "hi",
    });
    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns null resendId when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendContactMessage({
      name: "Jane",
      email: "jane@example.com",
      message: "hi",
    });
    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendReadingOverdueAlert", () => {
  it("sends to NOTIFICATION_EMAIL not the client", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_d7a" } });
    const submission = buildSubmission();

    const result = await sendReadingOverdueAlert(submission);

    expect(getResendId(result)).toBe("msg_d7a");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("hello@withjosephine.com");
    expect(args.to).not.toBe(submission.email);
    expect(args.subject).toContain("overdue");
    expect(visibleText(args.html)).toContain(submission.id);
  });

  it("returns null resendId when NOTIFICATION_EMAIL missing", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    const result = await sendReadingOverdueAlert(buildSubmission());
    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("RESEND_DRY_RUN gate", () => {
  it("skips sending when RESEND_DRY_RUN=1 and returns null resendId", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("also gates when RESEND_DRY_RUN='true' (matches project env-flag convention)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "true");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does NOT gate when RESEND_DRY_RUN='0' or other non-flag value", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "0");
    sendMock.mockResolvedValue({ data: { id: "msg_off" } });

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBe("msg_off");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("gates BEFORE the API-key check (staging without RESEND_API_KEY still logs dry-run)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    vi.stubEnv("RESEND_API_KEY", "");
    const warnSpy = vi.spyOn(console, "warn");

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
    const messages = warnSpy.mock.calls.map((args) => String(args[0]));
    expect(messages.some((m) => m.includes("RESEND_DRY_RUN"))).toBe(true);
    expect(messages.some((m) => m.includes("RESEND_API_KEY"))).toBe(false);
  });

  it("redacts recipient local-part in dry-run log (PII hygiene)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    const warnSpy = vi.spyOn(console, "warn");

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

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBe("msg_default");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("gates sendOrderConfirmation when RESEND_DRY_RUN=1", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");

    const result = await sendOrderConfirmation(buildSubmission());

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("gates sendContactMessage when RESEND_DRY_RUN=1", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");

    const result = await sendContactMessage({
      name: "Ada",
      email: "ada@example.com",
      message: "Hi",
    });

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("gates sendReadingDelivery when RESEND_DRY_RUN=1 (covers delivery cron path)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");

    const result = await sendReadingDelivery(buildSubmission(), "https://example.com/listen/abc");

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("email_sent server analytics", () => {
  it("fires email_sent on real send with the right sub_type + submission_id", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_oc" } });
    const submission = buildSubmission();

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

    await sendOrderConfirmation(submission);

    expect(serverTrackMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does NOT fire when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const submission = buildSubmission();

    await sendOrderConfirmation(submission);

    expect(serverTrackMock).not.toHaveBeenCalled();
  });
});

describe("sendMagicLink", () => {
  it("sends to the recipient with the magic-link URL embedded", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_ml" } });

    const result = await sendMagicLink({
      to: "ada@example.com",
      magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=abc",
    });

    expect(getResendId(result)).toBe("msg_ml");
    const args = sendMock.mock.calls[0]?.[0];
    expect(args.to).toBe("ada@example.com");
    expect(args.subject).toBe("Open your reading");
    expect(args.html).toContain("https://withjosephine.com/api/auth/magic-link/verify?token=abc");
  });

  it("emits email_sent with sub_type=magic_link and null submission_id", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_ml" } });

    await sendMagicLink({
      to: "ada@example.com",
      magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=abc",
    });

    const props = serverTrackMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(props.sub_type).toBe("magic_link");
    expect(props.submission_id).toBeNull();
    expect(props.distinct_id).toBe("anon-test");
  });

  it("returns null resendId on RESEND_DRY_RUN without firing", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");

    const result = await sendMagicLink({
      to: "ada@example.com",
      magicLinkUrl: "https://example.com/x",
    });

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
    expect(serverTrackMock).not.toHaveBeenCalled();
  });

  it("substitutes {firstName}/{readingName}/{readingPriceDisplay} when vars are supplied", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_ml_tokens" } });
    const { stringToPortableTextBlocks } = await import("./emails/portableTextBuild");
    vi.mocked(sanityFetchMocks.fetchEmailMagicLink).mockResolvedValue({
      subject: "Open your {readingName}, {firstName}",
      preview: "{firstName}, your reading is one tap away",
      heroLine: "Welcome back, {firstName}",
      buttonLabel: "Open my {readingName}",
      body: stringToPortableTextBlocks(
        "Tap the button to open your {readingName} ({readingPriceDisplay}).",
      ),
      signOff: null,
    });

    await sendMagicLink({
      to: "ada@example.com",
      magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=tk",
      firstName: "Ada",
      readingName: "Soul Blueprint",
      readingPriceDisplay: "$179",
    });

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.subject).toBe("Open your Soul Blueprint, Ada");
    const body = visibleText(args.html);
    expect(body).toContain("Welcome back, Ada");
    expect(body).toContain("Open my Soul Blueprint");
    expect(body).toContain("Tap the button to open your Soul Blueprint ($179).");
  });

  it("falls back to 'there' for firstName when no vars supplied", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_ml_fallback" } });
    vi.mocked(sanityFetchMocks.fetchEmailMagicLink).mockResolvedValue({
      subject: "Hello {firstName}",
      preview: "Hi {firstName}",
      heroLine: "Hi {firstName}",
      buttonLabel: "Open my reading",
      body: (await import("./emails/portableTextBuild")).stringToPortableTextBlocks(
        "Hi {firstName}, your link is below.",
      ),
      signOff: null,
    });

    await sendMagicLink({
      to: "ada@example.com",
      magicLinkUrl: "https://example.com/x",
    });

    const args = sendMock.mock.calls[0]?.[0];
    expect(args.subject).toBe("Hello there");
    expect(visibleText(args.html)).toContain("Hi there, your link is below.");
  });
});

describe("per-request dry-run header (X-E2E-Resend-DryRun)", () => {
  it("skips sending when the header matches RESEND_E2E_DRY_RUN_SECRET", async () => {
    vi.stubEnv("RESEND_E2E_DRY_RUN_SECRET", "tok_e2e_abc");
    headersGetMock.mockImplementation((name: string) =>
      name.toLowerCase() === "x-e2e-resend-dry-run" ? "tok_e2e_abc" : null,
    );

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does NOT skip when the header is absent (humans still get real emails)", async () => {
    vi.stubEnv("RESEND_E2E_DRY_RUN_SECRET", "tok_e2e_abc");
    sendMock.mockResolvedValue({ data: { id: "msg_human" } });
    headersGetMock.mockReturnValue(null);

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBe("msg_human");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("does NOT skip when the header value does NOT match the secret", async () => {
    vi.stubEnv("RESEND_E2E_DRY_RUN_SECRET", "tok_e2e_abc");
    sendMock.mockResolvedValue({ data: { id: "msg_mismatch" } });
    headersGetMock.mockImplementation((name: string) =>
      name.toLowerCase() === "x-e2e-resend-dry-run" ? "wrong" : null,
    );

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBe("msg_mismatch");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("fail-closed: skips sending AND logs an error when the header is present but RESEND_E2E_DRY_RUN_SECRET is unset", async () => {
    vi.stubEnv("RESEND_E2E_DRY_RUN_SECRET", "");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    headersGetMock.mockImplementation((name: string) =>
      name.toLowerCase() === "x-e2e-resend-dry-run" ? "anything" : null,
    );

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("[resend] DRY_RUN_SECRET_UNSET"));
    errSpy.mockRestore();
  });

  it("does NOT skip and does NOT log when the secret is unset AND the header is absent (cold non-request callers + cron)", async () => {
    vi.stubEnv("RESEND_E2E_DRY_RUN_SECRET", "");
    sendMock.mockResolvedValue({ data: { id: "msg_no_secret_no_header" } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    headersGetMock.mockReturnValue(null);

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBe("msg_no_secret_no_header");
    expect(sendMock).toHaveBeenCalledOnce();
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("isSandboxEmail", () => {
  it("matches known sandbox spec prefixes on @withjosephine.com", () => {
    expect(isSandboxEmail("listen-roundtrip+abc@withjosephine.com")).toBe(true);
    expect(isSandboxEmail("stripe-roundtrip+abc@withjosephine.com")).toBe(true);
    expect(isSandboxEmail("v120-qa+gift-abc@withjosephine.com")).toBe(true);
    expect(isSandboxEmail("listen-one-tap+abc@withjosephine.com")).toBe(true);
    expect(isSandboxEmail("prod-smoke+abc@withjosephine.com")).toBe(true);
  });

  it("does NOT match sandbox prefixes on other domains (spoofing guard)", () => {
    expect(isSandboxEmail("stripe-roundtrip+abc@evil.example")).toBe(false);
    expect(isSandboxEmail("listen-roundtrip+abc@gmail.com")).toBe(false);
  });

  it("does NOT match non-sandbox addresses on @withjosephine.com", () => {
    expect(isSandboxEmail("hello@withjosephine.com")).toBe(false);
    expect(isSandboxEmail("becky@withjosephine.com")).toBe(false);
  });

  it("is case-insensitive on local-part and domain", () => {
    expect(isSandboxEmail("LISTEN-ROUNDTRIP+ABC@WITHJOSEPHINE.COM")).toBe(true);
  });

  it("returns false for null/undefined/empty input", () => {
    expect(isSandboxEmail(null)).toBe(false);
    expect(isSandboxEmail(undefined)).toBe(false);
    expect(isSandboxEmail("")).toBe(false);
  });
});

describe("sandbox-prefix dry-run guard (DO alarms + cron + Stripe webhook)", () => {
  it("forces dry-run when the recipient `to` matches a sandbox prefix (cron delivery path)", async () => {
    headersGetMock.mockReturnValue(null);

    const result = await sendReadingDelivery(
      buildSubmission({ email: "listen-roundtrip+abc123@withjosephine.com" }),
      "https://withjosephine.com/listen/abc",
    );

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("forces dry-run when the originatorEmail matches sandbox (admin notification path)", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "hello@withjosephine.com");
    headersGetMock.mockReturnValue(null);

    const result = await sendNotificationToJosephine(
      buildSubmission({ email: "stripe-roundtrip+xyz@withjosephine.com" }),
    );

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does NOT force dry-run when neither recipient nor originator is a sandbox alias", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL", "hello@withjosephine.com");
    sendMock.mockResolvedValue({ data: { id: "msg_real" } });
    headersGetMock.mockReturnValue(null);

    const result = await sendNotificationToJosephine(buildSubmission());

    expect(getResendId(result)).toBe("msg_real");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("tags the skip-log reason so cron/DO/webhook leaks are observable in wrangler tail", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    headersGetMock.mockReturnValue(null);

    await sendReadingDelivery(
      buildSubmission({ email: "listen-roundtrip+abc@withjosephine.com" }),
      "https://withjosephine.com/listen/abc",
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("reason=sandbox_prefix"));
    warnSpy.mockRestore();
  });
});

describe("env_guard (layer-3 defense in non-production envs)", () => {
  it("blocks non-allowlisted recipient in staging env", async () => {
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "staging");
    headersGetMock.mockReturnValue(null);

    const result = await sendOrderConfirmation(
      buildSubmission({ email: "real-customer@example.com" }),
    );

    expect(getResendId(result)).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("allows production-allowlisted recipient in staging env", async () => {
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "staging");
    sendMock.mockResolvedValue({ data: { id: "msg_allowed" } });
    headersGetMock.mockReturnValue(null);

    const result = await sendOrderConfirmation(buildSubmission({ email: "maxgertzen@gmail.com" }));

    expect(getResendId(result)).toBe("msg_allowed");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("strips +addressing when matching the production allowlist", async () => {
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "staging");
    sendMock.mockResolvedValue({ data: { id: "msg_plussed" } });
    headersGetMock.mockReturnValue(null);

    const result = await sendOrderConfirmation(
      buildSubmission({ email: "maxgertzen+sandbox-test@gmail.com" }),
    );

    expect(getResendId(result)).toBe("msg_plussed");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("allows the NOTIFICATION_EMAIL env value", async () => {
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "staging");
    vi.stubEnv("NOTIFICATION_EMAIL", "ops@withjosephine.com");
    sendMock.mockResolvedValue({ data: { id: "msg_notif" } });
    headersGetMock.mockReturnValue(null);

    const result = await sendOrderConfirmation(buildSubmission({ email: "ops@withjosephine.com" }));

    expect(getResendId(result)).toBe("msg_notif");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("does not fire in production env regardless of recipient", async () => {
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "production");
    sendMock.mockResolvedValue({ data: { id: "msg_prod" } });
    headersGetMock.mockReturnValue(null);

    const result = await sendOrderConfirmation(
      buildSubmission({ email: "real-customer@example.com" }),
    );

    expect(getResendId(result)).toBe("msg_prod");
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("tags the skip-log reason for wrangler-tail observability", async () => {
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "staging");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    headersGetMock.mockReturnValue(null);

    await sendOrderConfirmation(buildSubmission({ email: "real-customer@example.com" }));

    const allWarnCalls = warnSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(allWarnCalls).toMatch(/env_guard/);
    expect(allWarnCalls).toMatch(/reason=env_guard/);
    warnSpy.mockRestore();
  });
});

describe("redactEmail", () => {
  it("keeps the first character of locals ≥3 chars", () => {
    expect(redactEmail("ada@example.com")).toBe("a***@example.com");
    expect(redactEmail("maxgertzen+gift-scheduled@gmail.com")).toBe("m***@gmail.com");
  });

  it("drops the local entirely when local-part is ≤2 chars (short locals would otherwise leak the original)", () => {
    expect(redactEmail("a@example.com")).toBe("***@example.com");
    expect(redactEmail("ab@example.com")).toBe("***@example.com");
  });

  it("returns the input unchanged when it has no @", () => {
    expect(redactEmail("not-an-email")).toBe("not-an-email");
  });

  it("returns the input unchanged when @ is the first character", () => {
    expect(redactEmail("@example.com")).toBe("@example.com");
  });
});

// PR #188's gift-email-variant split + body-PT consolidation shipped without a
// render-path test. Staging then 500'd on every gift email send with
// `TypeError: Cannot read properties of null (reading 'useMemo')` thrown out
// of `@portabletext/react`'s `<PortableText>` inside `@react-email/render`'s
// workerd entry. These tests exercise the four gift send paths against the
// Sanity shape Becky's Studio + the body-consolidation migration actually
// produce, so any regression that swaps the hook-free PT renderer back for
// `@portabletext/react` (or drops `body`/`refundLine`/`shareUrlHelper`
// rendering on the migrated shape) trips the suite at PR time.
describe("PortableTextBody renderer guard", () => {
  it("PortableTextBody does NOT import @portabletext/react (hook-free renderer guard)", async () => {
    // The bug surface that bit staging: `<PortableText>` from
    // `@portabletext/react` calls `useMemo`, which throws when react-email's
    // workerd render path dispatches without a hook context. If this import
    // creeps back in via a future refactor, this guard fails immediately.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = await fs.readFile(
      path.resolve(process.cwd(), "src/lib/emails/PortableTextBody.tsx"),
      "utf-8",
    );
    expect(file).not.toMatch(/from\s+["']@portabletext\/react["']/);
  });
});
