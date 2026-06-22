import { decodeSignatureHeader, isValidSignature } from "@sanity/webhook";

export const REPLAY_WINDOW_MS = 5 * 60 * 1000;
export const MAX_WEBHOOK_BODY_BYTES = 1_000_000;

export function isTimestampFresh(timestampMs: number, now: number = Date.now()): boolean {
  return Number.isFinite(timestampMs) && Math.abs(now - timestampMs) <= REPLAY_WINDOW_MS;
}

export async function verifySignedRequest(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  let decoded: { timestamp: number; hashedPayload: string };
  try {
    decoded = decodeSignatureHeader(signatureHeader);
  } catch {
    return false;
  }
  if (!isTimestampFresh(decoded.timestamp)) return false;
  return isValidSignature(rawBody, signatureHeader, secret);
}
