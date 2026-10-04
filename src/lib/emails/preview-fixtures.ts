import {
  EMAIL_GIFT_OPENED_DEFAULTS,
  EMAIL_GIFT_PURCHASE_DEFAULTS,
  EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS,
  EMAIL_MAGIC_LINK_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  EMAIL_PRIVACY_EXPORT_DEFAULTS,
  EMAIL_READING_DELIVERY_DEFAULTS,
} from "@/data/defaults";

export const PREVIEW_FIXTURE = {
  firstName: "Ada",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  amountPaidDisplay: "$179",
  listenUrl: "https://withjosephine.com/listen/preview",
  magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=preview",
  downloadUrl: "https://images.withjosephine.com/exports/preview.zip",
  dataExportUrl: "https://withjosephine.com/privacy/export?t=preview",
  expiryDays: 7,
} as const;

export const PREVIEW_GIFT = {
  code: "PREVIEW-GIFT",
  readingSlug: "birth-chart",
  readingName: "Birth Chart Reading",
  buyerFirstName: "Dana",
  recipientFirstName: "Anna",
  note: "Happy birthday, Anna. I thought of you the moment I saw this.",
  giftUrl: "https://withjosephine.com/gift/PREVIEW-GIFT",
  whatsappUrl: "https://wa.me/?text=preview",
  sendUrl: "https://withjosephine.com/gift/send#preview",
} as const;

export const PREVIEW_DEFAULTS = {
  emailOrderConfirmation: EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  emailReadingDelivery: EMAIL_READING_DELIVERY_DEFAULTS,
  emailMagicLink: EMAIL_MAGIC_LINK_DEFAULTS,
  emailPrivacyExport: EMAIL_PRIVACY_EXPORT_DEFAULTS,
  emailGiftPurchase: EMAIL_GIFT_PURCHASE_DEFAULTS,
  emailGiftOpened: EMAIL_GIFT_OPENED_DEFAULTS,
  emailGiftRecipientConfirmation: EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS,
} as const;
