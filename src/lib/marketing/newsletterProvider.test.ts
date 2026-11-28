import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addNewsletterContact } from "./newsletterProvider";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Brevo newsletter provider", () => {
  it("is not configured and sends nothing without an API key", async () => {
    vi.stubEnv("BREVO_NEWSLETTER_LIST_ID", "7");

    expect(await addNewsletterContact("ada@example.com")).toEqual({ kind: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is not configured without a whole-number list id", async () => {
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("BREVO_NEWSLETTER_LIST_ID", "newsletter");

    expect(await addNewsletterContact("ada@example.com")).toEqual({ kind: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds the contact to the list with the api-key header and updates an existing contact", async () => {
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("BREVO_NEWSLETTER_LIST_ID", "7");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 21 }), { status: 201 }));

    expect(await addNewsletterContact("ada@example.com")).toEqual({ kind: "added" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/contacts");
    expect(init.method).toBe("POST");
    expect(init.headers["api-key"]).toBe("key");
    expect(JSON.parse(init.body)).toEqual({ email: "ada@example.com", listIds: [7], updateEnabled: true });
  });

  it("reports the status code without the address when Brevo refuses", async () => {
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("BREVO_NEWSLETTER_LIST_ID", "7");
    fetchMock.mockResolvedValue(new Response("{}", { status: 400 }));

    const result = await addNewsletterContact("ada@example.com");
    expect(result).toEqual({ kind: "failed", error: "brevo-contact-add: HTTP 400" });
  });
});
