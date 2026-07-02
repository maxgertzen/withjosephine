export const BOOKING_API_ROUTE = "/api/booking";
export const UPLOAD_URL_API_ROUTE = "/api/booking/upload-url";

export const AUTH_MAGIC_LINK_ROUTE = "/api/auth/magic-link";
export const AUTH_MAGIC_LINK_VERIFY_ROUTE = "/api/auth/magic-link/verify";
export const CONTACT_API_ROUTE = "/api/contact";
export const PRIVACY_EXPORT_API_ROUTE = "/api/privacy/export";
export const DRAFT_DISABLE_ROUTE = "/api/draft/disable";

export const BOOKING_PAGE_ROUTES = {
  entry: (slug: string) => `/book/${slug}`,
  letter: (slug: string) => `/book/${slug}/letter`,
  intake: (slug: string) => `/book/${slug}/intake`,
} as const;
