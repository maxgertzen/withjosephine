// Country/region rules for the geo-conditional consent banner.
// `country` is ISO 3166-1 alpha-2 from Cloudflare's `cf-ipcountry`.
// `region` for the US is the state name from `cf-region`.

const GDPR_ALIGNED_COUNTRIES: ReadonlySet<string> = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA
  "IS", "LI", "NO",
  // UK + Switzerland
  "GB", "CH",
]);

export function requiresConsent(
  country: string | null,
  region: string | null,
): boolean {
  if (country == null) return false;
  if (GDPR_ALIGNED_COUNTRIES.has(country)) return true;
  if (country === "US" && region === "California") return true;
  return false;
}

export const CONSENT_HEADER = "x-josephine-consent-required";
