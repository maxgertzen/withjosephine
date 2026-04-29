export const HONEYPOT_FIELD = "website";

export const ACCEPTED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_PHOTO_MIME_SET: ReadonlySet<string> = new Set(ACCEPTED_PHOTO_MIME);
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const BOOKING_API_ROUTE = "/api/booking";
export const UPLOAD_URL_API_ROUTE = "/api/booking/upload-url";

export const BOOKING_ROUTES = {
  entry: (slug: string) => `/book/${slug}`,
  letter: (slug: string) => `/book/${slug}/letter`,
  intake: (slug: string) => `/book/${slug}/intake`,
} as const;
