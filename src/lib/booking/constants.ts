export const HONEYPOT_FIELD = "website";

export const COMPANION_SUFFIX_UNKNOWN = "_unknown";
export const COMPANION_SUFFIX_GEONAMEID = "_geonameid";

export const ACCEPTED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_PHOTO_MIME_SET: ReadonlySet<string> = new Set(ACCEPTED_PHOTO_MIME);
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const MAX_EMAIL_CHARS = 254;

// Canonical Sanity booking-form field key for the recipient's email input.
// Mirrors `key: "email"` in scripts/seed-booking-form.ts.
export const EMAIL_FIELD_KEY = "email";
