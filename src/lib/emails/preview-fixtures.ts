import {
  EMAIL_DAY7_DELIVERY_DEFAULTS,
  EMAIL_MAGIC_LINK_DEFAULTS,
  EMAIL_MAGIC_LINK_LIBRARY_DEFAULTS,
  EMAIL_NEW_DEVICE_NOTICE_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  EMAIL_PRIVACY_EXPORT_DEFAULTS,
  STEP_UP_OTP_EMAIL_DEFAULTS,
} from "@/data/defaults";

export const PREVIEW_FIXTURE = {
  firstName: "Ada",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  amountPaidDisplay: "$179",
  listenUrl: "https://withjosephine.com/listen/preview",
  magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=preview",
  downloadUrl: "https://images.withjosephine.com/exports/preview.zip",
  submissionCount: 2,
  expiryDays: 7,
  stepUpOtpCode: "428913",
  revokeUrl: "https://withjosephine.com/api/auth/revoke-recipient-sessions?t=preview",
} as const;

export const PREVIEW_DEFAULTS = {
  emailOrderConfirmation: EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  emailDay7Delivery: EMAIL_DAY7_DELIVERY_DEFAULTS,
  emailMagicLink: EMAIL_MAGIC_LINK_DEFAULTS,
  emailMagicLinkLibrary: EMAIL_MAGIC_LINK_LIBRARY_DEFAULTS,
  emailPrivacyExport: EMAIL_PRIVACY_EXPORT_DEFAULTS,
  emailStepUpOtp: STEP_UP_OTP_EMAIL_DEFAULTS,
  emailNewDeviceNotice: EMAIL_NEW_DEVICE_NOTICE_DEFAULTS,
} as const;
