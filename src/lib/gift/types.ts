export const GIFT_STATUS = {
  pending: "pending",
  expired: "expired",
  active: "active",
  redeemed: "redeemed",
  cancelled: "cancelled",
} as const;

export type GiftStatus = (typeof GIFT_STATUS)[keyof typeof GIFT_STATUS];

export const GIFT_SEND_LIMIT = 2;

export type GiftEmailFiredType = "gift_confirmation" | "gift_send" | "gift_opened";

export type GiftEmailFiredEntry = {
  type: GiftEmailFiredType;
  sentAt: string;
  resendId: string | null;
};

export type GiftRecord = {
  id: string;
  lookupHash: string;
  readingSlug: string;
  status: GiftStatus;
  buyerFirstName: string;
  buyerEmail: string | null;
  note: string | null;
  coolingOffAcknowledgedAt: string;
  consentLabel: string;
  consentIpAddress: string | null;
  stripeSessionId: string | null;
  createdAt: string;
  activatedAt: string | null;
  buyerEmailClaimedAt: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  sendCount: number;
  lastSentAt: string | null;
  redeemedSubmissionId: string | null;
  redeemedAt: string | null;
  expiredAt: string | null;
  updatedAt: string;
  emailsFired: GiftEmailFiredEntry[];
};

export type GiftState = "active" | "redeemed" | "not_active" | "not_found";
