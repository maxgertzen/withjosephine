import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/marketing/newsletterProvider", () => ({
  addNewsletterContact: vi.fn(),
}));

import { addNewsletterContact } from "@/lib/marketing/newsletterProvider";

import { confirmNewsletterSignup } from "./confirmNewsletterSignup";
import { findEmailSignup, saveEmailSignup } from "./emailSignups";
import { mintNewsletterConfirmToken, NEWSLETTER_CONFIRM_TTL_MS } from "./newsletterConfirmToken";

const CONSENT = "Yes, send me the newsletter.";

const addContact = vi.mocked(addNewsletterContact);
const NOW = new Date("2026-11-04T10:00:00Z");

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  addContact.mockReset().mockResolvedValue({ kind: "not_configured" });
});

async function newsletterSignup() {
  const signup = await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: CONSENT });
  return { signup, token: await mintNewsletterConfirmToken(signup.id, signup.email, NOW.getTime()) };
}

describe("confirmNewsletterSignup", () => {
  it("confirms the signup and stays confirmed when Brevo is not configured yet", async () => {
    const { signup, token } = await newsletterSignup();

    expect(await confirmNewsletterSignup(token, NOW)).toBe(true);
    const stored = await findEmailSignup(signup.id);
    expect(stored?.confirmedAt).toBe(NOW.toISOString());
    expect(stored?.providerSyncedAt).toBeNull();
    expect(addContact).toHaveBeenCalledWith("ada@example.com");
  });

  it("marks the signup sent to the provider once the provider adds it, and does not add it again", async () => {
    addContact.mockResolvedValue({ kind: "added" });
    const { signup, token } = await newsletterSignup();

    await confirmNewsletterSignup(token, NOW);
    await confirmNewsletterSignup(token, NOW);

    expect((await findEmailSignup(signup.id))?.providerSyncedAt).toBe(NOW.toISOString());
    expect(addContact).toHaveBeenCalledTimes(1);
  });

  it("refuses an expired token and changes nothing", async () => {
    const { signup, token } = await newsletterSignup();

    expect(await confirmNewsletterSignup(token, new Date(NOW.getTime() + NEWSLETTER_CONFIRM_TTL_MS + 1))).toBe(false);
    expect((await findEmailSignup(signup.id))?.confirmedAt).toBeNull();
    expect(addContact).not.toHaveBeenCalled();
  });

  it("refuses a changed token", async () => {
    const { signup, token } = await newsletterSignup();
    const [payload] = token.split(".");

    expect(await confirmNewsletterSignup(`${payload}.AAAA`, NOW)).toBe(false);
    expect((await findEmailSignup(signup.id))?.confirmedAt).toBeNull();
  });

  it("refuses a token minted for a different address than the stored signup", async () => {
    const signup = await saveEmailSignup({ email: "ada@example.com", source: "footer", consentText: CONSENT });
    const token = await mintNewsletterConfirmToken(signup.id, "someone-else@example.com", NOW.getTime());

    expect(await confirmNewsletterSignup(token, NOW)).toBe(false);
    expect((await findEmailSignup(signup.id))?.confirmedAt).toBeNull();
  });

  it("refuses a token for a download-only signup", async () => {
    const signup = await saveEmailSignup({ email: "ada@example.com", source: "links:file:1", consentText: null });
    const token = await mintNewsletterConfirmToken(signup.id, signup.email, NOW.getTime());

    expect(await confirmNewsletterSignup(token, NOW)).toBe(false);
    expect(addContact).not.toHaveBeenCalled();
  });
});
