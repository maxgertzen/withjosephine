export type GiftCheckRequest = { code: string; readingSlug: string };

export type GiftCheckResponse =
  | { result: "valid"; path: string }
  | { result: "other_reading"; readingSlug: string; readingName: string; path: string }
  | { result: "not_found" }
  | { result: "rate_limited" };
