import {
  EMAIL_DAY2_STARTED_DEFAULTS,
  EMAIL_DAY7_DELIVERY_DEFAULTS,
  EMAIL_GIFT_CLAIM_DEFAULTS,
  EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS,
  EMAIL_MAGIC_LINK_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  EMAIL_PRIVACY_EXPORT_DEFAULTS,
  EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS,
} from "@/data/defaults";

export const PREVIEW_FIXTURE = {
  firstName: "Ada",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  amountPaidDisplay: "$179",
  listenUrl: "https://withjosephine.com/listen/preview",
  magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=preview",
  myGiftsUrl: "https://withjosephine.com/my-gifts",
  purchaserFirstName: "Maya",
  recipientName: "River",
  giftMessage: "Thinking of you — I hope this lands at the right moment.",
  claimUrl: "https://withjosephine.com/gift/claim/preview",
  sendAtDisplay: "Friday, December 12 at 9:00 AM",
  downloadUrl: "https://images.withjosephine.com/exports/preview.zip",
  submissionCount: 2,
  expiryDays: 7,
} as const;

export const PREVIEW_DEFAULTS = {
  emailOrderConfirmation: EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  emailDay2Started: EMAIL_DAY2_STARTED_DEFAULTS,
  emailDay7Delivery: EMAIL_DAY7_DELIVERY_DEFAULTS,
  emailGiftPurchaseConfirmation: EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS,
  emailGiftClaim: EMAIL_GIFT_CLAIM_DEFAULTS,
  emailMagicLink: EMAIL_MAGIC_LINK_DEFAULTS,
  emailPrivacyExport: EMAIL_PRIVACY_EXPORT_DEFAULTS,
  emailRecipientIntakeReceived: EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS,
} as const;
