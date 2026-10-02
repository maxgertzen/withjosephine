export const SITE_ORIGIN_BY_DATASET = {
  production: "https://withjosephine.com",
  staging: "https://staging.withjosephine.com",
} as const;

export function siteOriginFor(dataset: string): string {
  return dataset === "staging" ? SITE_ORIGIN_BY_DATASET.staging : SITE_ORIGIN_BY_DATASET.production;
}
