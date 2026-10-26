import { useMemo } from "react";
import { useClient } from "sanity";

const DRAFTS_PERSPECTIVE_API_VERSION = "2025-02-19";

export function useDraftsClient() {
  const baseClient = useClient({ apiVersion: DRAFTS_PERSPECTIVE_API_VERSION });
  return useMemo(() => baseClient.withConfig({ perspective: "drafts" }), [baseClient]);
}
