import { R2_PUBLIC_ORIGIN } from "@/lib/constants";

export const HONEYPOT_FIELD = "website";

export const COMPANION_SUFFIX_UNKNOWN = "_unknown";
export const COMPANION_SUFFIX_GEONAMEID = "_geonameid";

export const ACCEPTED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_PHOTO_MIME_SET: ReadonlySet<string> = new Set(ACCEPTED_PHOTO_MIME);
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const PHOTO_PUBLIC_URL_BASE = R2_PUBLIC_ORIGIN;

export const MAX_ACTIVE_GIFTS_PER_RECIPIENT = 3;

export const MAX_EMAIL_CHARS = 254;

export const GIFT_DELIVERY = {
  selfSend: "self_send",
  scheduled: "scheduled",
} as const;
