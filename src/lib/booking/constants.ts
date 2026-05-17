import { R2_PUBLIC_ORIGIN } from "@/lib/constants";

export const HONEYPOT_FIELD = "website";

export const COMPANION_SUFFIX_UNKNOWN = "_unknown";
export const COMPANION_SUFFIX_GEONAMEID = "_geonameid";

export const ACCEPTED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_PHOTO_MIME_SET: ReadonlySet<string> = new Set(ACCEPTED_PHOTO_MIME);
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const BOOKING_API_ROUTE = "/api/booking";
export const BOOKING_API_GIFT_REDEEM_ROUTE = "/api/booking/gift-redeem";
export const UPLOAD_URL_API_ROUTE = "/api/booking/upload-url";

export const PHOTO_PUBLIC_URL_BASE = R2_PUBLIC_ORIGIN;

export const BOOKING_API_GIFT_ROUTE = "/api/booking/gift";

export const MAX_ACTIVE_GIFTS_PER_RECIPIENT = 3;

export const MAX_EMAIL_CHARS = 254;

/**
 * Gift delivery method codes used at the API + DB layer. The string-union
 * type lives next to the persistence layer at
 * `src/lib/booking/persistence/repository.ts` — importing this const
 * instead of typing the literal protects against typos at every
 * `=== "self_send" / "scheduled"` site.
 */
export const GIFT_DELIVERY = {
  selfSend: "self_send",
  scheduled: "scheduled",
} as const;

export const BOOKING_ROUTES = {
  entry: (slug: string) => `/book/${slug}`,
  letter: (slug: string) => `/book/${slug}/letter`,
  intake: (slug: string) => `/book/${slug}/intake`,
  gift: (slug: string) => `/book/${slug}/gift`,
} as const;
