export const BREVO_API_BASE = "https://api.brevo.com/v3";

export function brevoHeaders(apiKey: string): Record<string, string> {
  return { "api-key": apiKey, Accept: "application/json" };
}
