import type { SanityReading } from "@/lib/sanity/types";

function parseStripePaymentLink(link: string | undefined): URL | null {
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".stripe.com")) return null;
  return url;
}

export function isStripePaymentLink(link: string | undefined): boolean {
  return parseStripePaymentLink(link) !== null;
}

export function buildPaymentUrl(
  reading: Pick<SanityReading, "stripePaymentLink">,
  clientReferenceId: string,
  email?: string,
): string | null {
  const url = parseStripePaymentLink(reading.stripePaymentLink);
  if (!url) return null;
  url.searchParams.set("client_reference_id", clientReferenceId);
  if (email !== undefined) url.searchParams.set("prefilled_email", email);
  return url.toString();
}
