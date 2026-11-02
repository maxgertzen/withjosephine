import { useMemo } from "react";
import { useClient, type ValidationContext } from "sanity";

export const PERSPECTIVE_API_VERSION = "2025-02-19";

export function usePerspectiveClient(perspective: "drafts" | "raw" | "published") {
  const baseClient = useClient({ apiVersion: PERSPECTIVE_API_VERSION });
  return useMemo(() => baseClient.withConfig({ perspective }), [baseClient, perspective]);
}

export function useDraftsClient() {
  return usePerspectiveClient("drafts");
}

export function publishedValidationClient(context: ValidationContext) {
  return context.getClient({ apiVersion: PERSPECTIVE_API_VERSION }).withConfig({ perspective: "published" });
}
