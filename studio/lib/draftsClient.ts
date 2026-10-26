import { useMemo } from "react";
import { useClient } from "sanity";

const PERSPECTIVE_API_VERSION = "2025-02-19";

export function usePerspectiveClient(perspective: "drafts" | "raw") {
  const baseClient = useClient({ apiVersion: PERSPECTIVE_API_VERSION });
  return useMemo(() => baseClient.withConfig({ perspective }), [baseClient, perspective]);
}

export function useDraftsClient() {
  return usePerspectiveClient("drafts");
}
