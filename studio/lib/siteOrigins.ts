export const SITE_ORIGIN_BY_DATASET = {
  production: "https://withjosephine.com",
  staging: "https://staging.withjosephine.com",
} as const;

const LOCAL_STUDIO_ORIGIN = "http://localhost:3333";
const LOCAL_SITE_ORIGIN = "http://localhost:3000";

export function previewOriginFor(studioOrigin: string, siteOrigin: string): string {
  return studioOrigin === LOCAL_STUDIO_ORIGIN ? LOCAL_SITE_ORIGIN : siteOrigin;
}

export function siteOriginFor(dataset: string): string {
  return dataset === "staging" ? SITE_ORIGIN_BY_DATASET.staging : SITE_ORIGIN_BY_DATASET.production;
}
