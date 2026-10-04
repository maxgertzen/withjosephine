export const BOOKING_API_ROUTE = "/api/booking";
export const UPLOAD_URL_API_ROUTE = "/api/booking/upload-url";

export const AUTH_MAGIC_LINK_ROUTE = "/api/auth/magic-link";
export const AUTH_MAGIC_LINK_VERIFY_ROUTE = "/api/auth/magic-link/verify";
export const CONTACT_API_ROUTE = "/api/contact";
export const PRIVACY_EXPORT_API_ROUTE = "/api/privacy/export";
export const DRAFT_DISABLE_ROUTE = "/api/draft/disable";
export const GIFT_PURCHASE_API_ROUTE = "/api/gift/purchase";
export const GIFT_NOTE_API_ROUTE = "/api/gift/note";
export const GIFT_CHECK_API_ROUTE = "/api/gift/check";
export const GIFT_SEND_API_ROUTE = "/api/gift/send";
export const GIFT_SEND_STATUS_API_ROUTE = "/api/gift/send/status";

export const bookingPath = (slug: string) => `/book/${slug}`;
export const readingAnchorId = (slug: string) => `reading-${slug}`;
export const homeReadingAnchor = (slug: string) => `/#${readingAnchorId(slug)}`;

export const homeSectionAnchor = (sectionId: string) => `/#${sectionId}`;
