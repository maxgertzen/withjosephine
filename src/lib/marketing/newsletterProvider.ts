import "server-only";

import { BREVO_API_BASE, brevoHeaders } from "@/lib/brevo";
import { optionalEnv } from "@/lib/env";

export type NewsletterAddResult =
  | { kind: "added" }
  | { kind: "not_configured" }
  | { kind: "failed"; error: string };

export async function addNewsletterContact(email: string): Promise<NewsletterAddResult> {
  const apiKey = optionalEnv("BREVO_API_KEY");
  const listId = Number(optionalEnv("BREVO_NEWSLETTER_LIST_ID"));
  if (!apiKey || !Number.isInteger(listId) || listId <= 0) return { kind: "not_configured" };

  try {
    const response = await fetch(`${BREVO_API_BASE}/contacts`, {
      method: "POST",
      headers: { ...brevoHeaders(apiKey), "Content-Type": "application/json" },
      body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
    });
    if (response.ok) return { kind: "added" };
    return { kind: "failed", error: `brevo-contact-add: HTTP ${response.status}` };
  } catch (error) {
    return { kind: "failed", error: `brevo-contact-add: ${error instanceof Error ? error.name : "unknown"}` };
  }
}
