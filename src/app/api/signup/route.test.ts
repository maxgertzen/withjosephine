import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: vi.fn() }));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendDownloadLink: vi.fn(), sendNewsletterConfirm: vi.fn() }));
vi.mock("@/lib/sanity/fetch", () => ({ fetchSiteSettingsPublished: vi.fn(), fetchLinksPagePublished: vi.fn() }));
vi.mock("@/lib/marketing/newsletterProvider", () => ({
  addNewsletterContact: vi.fn(),
}));

import { checkRateLimit } from "@/lib/auth/rateLimit";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";
import { linkKey } from "@/lib/links/linkKey";
import { addNewsletterContact } from "@/lib/marketing/newsletterProvider";
import { sendDownloadLink, sendNewsletterConfirm } from "@/lib/resend";
import { fetchLinksPagePublished, fetchSiteSettingsPublished } from "@/lib/sanity/fetch";
import type { SanityLinksPage, SanityLinksPageButton, SanitySiteSettings } from "@/lib/sanity/types";
import { verifyTurnstileToken } from "@/lib/turnstile";

import { POST } from "./route";

const GUIDE_FILE_ID = "file-guide";
const GUIDE_KEY = linkKey({ destination: "file", documentId: GUIDE_FILE_ID }) ?? "";

const guideButton = (overrides: Partial<SanityLinksPageButton> = {}): SanityLinksPageButton => ({
  _key: "a",
  label: "Free birth chart guide",
  destination: "file",
  askForEmail: true,
  file: { _id: GUIDE_FILE_ID, url: "https://cdn.sanity.io/files/p/d/guide.pdf" },
  ...overrides,
});

function publishLinksPage(page: SanityLinksPage) {
  vi.mocked(fetchLinksPagePublished).mockResolvedValue({
    page,
    aboutPhotoUrl: null,
    readings: [],
    notesState: null,
    siteSettings: null,
  });
}

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("https://withjosephine.com/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const DOWNLOAD = { email: "Ada@Example.com", wantsNewsletter: false, buttonKey: GUIDE_KEY, turnstileToken: "ok" };
const FOOTER = { email: "ada@example.com", wantsNewsletter: true, turnstileToken: "ok" };

const signupRows = () => dbQuery("SELECT email, source, wants_newsletter, consent_text FROM email_signups");

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://withjosephine.com");
  vi.mocked(verifyTurnstileToken).mockReset().mockResolvedValue(true);
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue(true);
  vi.mocked(sendDownloadLink).mockReset().mockResolvedValue({ kind: "sent", resendId: "re_1" });
  vi.mocked(sendNewsletterConfirm).mockReset().mockResolvedValue({ kind: "sent", resendId: "re_2" });
  vi.mocked(fetchLinksPagePublished).mockReset();
  publishLinksPage({ showPage: true, buttons: [guideButton()] });
  vi.mocked(fetchSiteSettingsPublished)
    .mockReset()
    .mockResolvedValue({ newsletter: { show: true } } as SanitySiteSettings);
  vi.mocked(addNewsletterContact).mockReset();
});

describe("POST /api/signup", () => {
  it.each([
    ["broken JSON", "{"],
    ["a missing turnstile token", { email: "ada@example.com", wantsNewsletter: true }],
    ["a filled honeypot", { ...FOOTER, hp_ref: "bot" }],
    ["an incomplete email", { ...FOOTER, email: "ada@" }],
  ])("rejects %s with 400 and stores nothing", async (_case, body) => {
    expect((await post(body)).status).toBe(400);
    expect(await signupRows()).toEqual([]);
  });

  it("rejects with 429 when the rate limit is hit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    expect((await post(FOOTER)).status).toBe(429);
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it("rejects with 400 when Turnstile fails", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);

    expect((await post(FOOTER)).status).toBe(400);
    expect(await signupRows()).toEqual([]);
  });

  it("emails the direct download address and stores no newsletter consent", async () => {
    expect((await post(DOWNLOAD)).status).toBe(200);

    expect(sendDownloadLink).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada@example.com",
        downloadUrl: "https://cdn.sanity.io/files/p/d/guide.pdf?dl=",
        downloadName: "Free birth chart guide",
      }),
    );
    expect(sendNewsletterConfirm).not.toHaveBeenCalled();
    expect(await signupRows()).toEqual([
      { email: "ada@example.com", source: `links:${GUIDE_KEY}`, wants_newsletter: 0, consent_text: null },
    ]);
  });

  it("sends both emails when the newsletter box is ticked on a download, and adds nobody to the provider yet", async () => {
    expect((await post({ ...DOWNLOAD, wantsNewsletter: true })).status).toBe(200);

    expect(sendDownloadLink).toHaveBeenCalledOnce();
    const confirm = vi.mocked(sendNewsletterConfirm).mock.calls[0][0];
    expect(confirm.confirmUrl).toMatch(/^https:\/\/withjosephine\.com\/newsletter\/confirm\?token=/);
    expect(confirm.confirmUrl).not.toContain("ada");
    expect(addNewsletterContact).not.toHaveBeenCalled();
  });

  it("refuses a button that does not ask for an email", async () => {
    publishLinksPage({ showPage: true, buttons: [guideButton({ askForEmail: false })] });

    expect((await post(DOWNLOAD)).status).toBe(400);
    expect(sendDownloadLink).not.toHaveBeenCalled();
  });

  it("refuses a download signup while the links page is switched off", async () => {
    publishLinksPage({ showPage: false, buttons: [guideButton()] });

    expect((await post(DOWNLOAD)).status).toBe(400);
    expect(await signupRows()).toEqual([]);
  });

  it("refuses an unknown button", async () => {
    expect((await post({ ...DOWNLOAD, buttonKey: "file:other" })).status).toBe(400);
  });

  it("refuses a footer signup without the newsletter box ticked", async () => {
    expect((await post({ ...FOOTER, wantsNewsletter: false })).status).toBe(400);
    expect(await signupRows()).toEqual([]);
  });

  it("sends only the download and stores no consent when a ticked box arrives while the newsletter is off", async () => {
    vi.mocked(fetchSiteSettingsPublished).mockResolvedValue({ newsletter: { show: false } } as SanitySiteSettings);

    expect((await post({ ...DOWNLOAD, wantsNewsletter: true })).status).toBe(200);

    expect(sendDownloadLink).toHaveBeenCalledOnce();
    expect(sendNewsletterConfirm).not.toHaveBeenCalled();
    expect(await signupRows()).toEqual([
      { email: "ada@example.com", source: `links:${GUIDE_KEY}`, wants_newsletter: 0, consent_text: null },
    ]);
  });

  it("refuses a footer signup while the newsletter box is switched off in Studio", async () => {
    vi.mocked(fetchSiteSettingsPublished).mockResolvedValue({ newsletter: { show: false } } as SanitySiteSettings);

    expect((await post(FOOTER)).status).toBe(400);
  });

  it("returns 502 when the email cannot be sent", async () => {
    vi.mocked(sendNewsletterConfirm).mockResolvedValue({ kind: "failed", error: "down" });

    expect((await post(FOOTER)).status).toBe(502);
  });
});
