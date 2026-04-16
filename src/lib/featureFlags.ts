export function isUnderConstruction(): boolean {
  const value = process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION;
  return value === "1" || value === "true";
}

export function isAnalyticsEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
}
