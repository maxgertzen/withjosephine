export const HONEYPOT_FIELD = "hp_ref";

export const COMPANION_SUFFIX_UNKNOWN = "_unknown";
export const COMPANION_SUFFIX_GEONAMEID = "_geonameid";

export const ACCEPTED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_PHOTO_MIME_SET: ReadonlySet<string> = new Set(ACCEPTED_PHOTO_MIME);
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const MAX_EMAIL_CHARS = 254;
export const GIFT_BUYER_NAME_MAX_CHARS = 80;
export const GIFT_NOTE_MAX_CHARS = 280;
export const GIFT_NOTE_COUNTER_SHOW_FROM = 220;
export const GIFT_NOTE_COUNTER_WARN_FROM = 260;
