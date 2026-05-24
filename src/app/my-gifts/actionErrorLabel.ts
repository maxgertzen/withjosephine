import type { MyGiftsPageContent } from "@/data/defaults";

/**
 * Maps a `useMutationAction` error code to a Sanity-editable copy string.
 * Each action passes its own override table for the codes specific to its
 * route (e.g. `rate_limited` on resend-link, `http_409` on edit-recipient).
 * Default codes (`network`, generic) fall through to the shared keys.
 */
export function actionErrorLabel(
  code: string | null,
  copy: MyGiftsPageContent,
  overrides: Partial<Record<string, keyof MyGiftsPageContent>> = {},
): string | null {
  if (!code) return null;
  const overrideKey = overrides[code];
  if (overrideKey) return copy[overrideKey];
  if (code === "network") return copy.actionNetworkError;
  return copy.actionGenericError;
}
