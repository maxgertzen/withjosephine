import { asConsentChoice, consentCookie } from "@/lib/consentCookie";
import { sharesSiteCookies } from "@/lib/constants";

function hostnameOf(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

function sentFromOurOwnPage(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  const originHost = hostnameOf(request.headers.get("origin"));
  return sharesSiteCookies(host) && originHost !== null && sharesSiteCookies(originHost);
}

const LONGEST_CHOICE_BYTES = "declined".length;

function bodyIsChoiceSized(request: Request): boolean {
  return Number(request.headers.get("content-length") ?? 0) <= LONGEST_CHOICE_BYTES;
}

export async function POST(request: Request): Promise<Response> {
  if (!sentFromOurOwnPage(request)) return new Response(null, { status: 403 });
  if (!bodyIsChoiceSized(request)) return new Response(null, { status: 413 });
  const choice = asConsentChoice(await request.text());
  if (!choice) return new Response(null, { status: 400 });
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": consentCookie(choice), "Cache-Control": "no-store" },
  });
}
