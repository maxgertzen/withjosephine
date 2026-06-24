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
  // Fail closed: when geo is unknown/unresolved/anonymized, require consent so
  // analytics never fires without a banner. "XX" = CF unknown, "T1" = Tor.
  if (country == null || country === "XX" || country === "T1") return true;
  if (GDPR_ALIGNED_COUNTRIES.has(country)) return true;
  if (country === "US" && region === "California") return true;
  return false;
}

// JS-readable cookie carrying the region consent-required flag ("1"/"0"). Set by
// middleware, read client-side by AnalyticsBootstrap so the layout stays static.
export const CONSENT_REQUIRED_COOKIE = "consent-required";
