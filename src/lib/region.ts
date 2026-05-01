/**
 * Country / region rules for the geo-conditional consent banner.
 *
 * EU/EEA + UK + Switzerland operate under GDPR-aligned regimes that
 * require consent before non-essential analytics. California (CCPA/CPRA)
 * is a state-level addition: detected via Cloudflare's `request.cf.region`
 * when the country is the US.
 *
 * Cloudflare's `request.cf.country` returns ISO 3166-1 alpha-2 codes.
 * `request.cf.region` for the US is the state name (e.g. "California").
 */

const EU_EEA_COUNTRIES: ReadonlyArray<string> = [
  // EU member states
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA additions
  "IS", "LI", "NO",
  // UK + Switzerland (GDPR-aligned regimes)
  "GB", "CH",
];

const EU_EEA_SET = new Set(EU_EEA_COUNTRIES);

export function requiresConsent(
  country: string | null,
  region: string | null,
): boolean {
  if (country == null) return false;
  if (EU_EEA_SET.has(country)) return true;
  if (country === "US" && region === "California") return true;
  return false;
}

/** Header name middleware writes; root layout reads via `headers()`. */
export const CONSENT_HEADER = "x-josephine-consent-required";
