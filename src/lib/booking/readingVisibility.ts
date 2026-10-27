export type OnSiteFlag = { onSite?: boolean | null };

export function isReadingOnSite(reading: OnSiteFlag | null | undefined): boolean {
  return reading?.onSite !== false;
}

export const OFF_THE_SITE_LABEL = "Off the site";
