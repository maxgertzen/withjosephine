import type { DocumentBadgeComponent } from "sanity";

import { isReadingOnSite, OFF_THE_SITE_LABEL, type OnSiteFlag } from "../../../src/lib/booking/readingVisibility";

export const offTheSiteBadge: DocumentBadgeComponent = ({ draft, published }) => {
  const shown = (draft ?? published) as OnSiteFlag | null;
  if (isReadingOnSite(shown)) return null;
  return { label: OFF_THE_SITE_LABEL, title: "Show on the site is off", color: "warning" };
};
