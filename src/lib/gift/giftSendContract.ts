export const GIFT_RECIPIENT_NAME_MAX_CHARS = 80;

export type GiftSendSummary = {
  buyerName: string;
  hasNote: boolean;
  recipientName: string | null;
};

export type GiftSendStatus =
  | { state: "invalid" }
  | { state: "opened" }
  | ({ state: "ready" } & GiftSendSummary)
  | ({ state: "sent"; lastSentAt: string | null } & GiftSendSummary)
  | { state: "used" };

export type GiftSendStatusRequest = { token: string };

export type GiftSendRequest = {
  token: string;
  expectedSendCount: 0 | 1;
  recipientName: string;
  recipientEmail: string;
  turnstileToken: string;
};

export type GiftRecipientFieldErrors =
  | { recipientName: "required" }
  | { recipientEmail: "invalid_email" | "own_email" };

function asRecord(body: unknown): Record<string, unknown> | null {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
}

export function parseGiftSendStatusRequest(body: unknown): GiftSendStatusRequest | null {
  const candidate = asRecord(body);
  return typeof candidate?.token === "string" ? { token: candidate.token } : null;
}

export function parseGiftSendRequest(body: unknown): GiftSendRequest | null {
  const candidate = asRecord(body);
  if (!candidate) return null;
  const { token, expectedSendCount, recipientName, recipientEmail, turnstileToken } = candidate;
  const isGiftSendRequest =
    typeof token === "string" &&
    (expectedSendCount === 0 || expectedSendCount === 1) &&
    typeof recipientName === "string" &&
    typeof recipientEmail === "string" &&
    typeof turnstileToken === "string";
  return isGiftSendRequest
    ? { token, expectedSendCount, recipientName, recipientEmail, turnstileToken }
    : null;
}
