import { draftMode, headers } from "next/headers";

import { AnalyticsBootstrap } from "@/components/AnalyticsBootstrap";
import { CONSENT_HEADER } from "@/lib/region";
import { fetchSiteSettings } from "@/lib/sanity/fetch";

export async function SiteAnalytics() {
  const [{ isEnabled: isDraftMode }, requestHeaders] = await Promise.all([draftMode(), headers()]);
  const consentRequired = requestHeaders.get(CONSENT_HEADER) === "1";
  const consentBannerContent =
    consentRequired || isDraftMode ? (await fetchSiteSettings())?.consentBanner ?? null : null;

  return (
    <AnalyticsBootstrap
      consentRequired={consentRequired}
      consentBannerContent={consentBannerContent}
      previewMode={isDraftMode}
    />
  );
}
