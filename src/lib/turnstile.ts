type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

const VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.BOOKING_TURNSTILE_BYPASS === "1"
  ) {
    console.warn(
      "[turnstile] BOOKING_TURNSTILE_BYPASS=1 — skipping verification (dev only)",
    );
    return true;
  }
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — rejecting verification");
    return false;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  const response = await fetch(VERIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) return false;

  const data = (await response.json()) as TurnstileResponse;
  return data.success === true;
}
