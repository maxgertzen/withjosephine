export type SubmissionStatus = "pending" | "paid" | "expired";

export type EmailFiredType =
  | "order_confirmation"
  | "day7"
  | "day7-overdue-alert"
  | "day14"
  | "abandonment";

export type EmailFiredEntry = {
  type: EmailFiredType;
  sentAt: string;
  resendId: string | null;
};

export type SubmissionRecord = {
  _id: string;
  status: SubmissionStatus;
  email: string;
  responses: Array<{
    fieldKey: string;
    fieldLabelSnapshot: string;
    fieldType: string;
    value: string;
  }>;
  photoR2Key?: string;
  stripeEventId?: string;
  stripeSessionId?: string;
  createdAt: string;
  paidAt?: string;
  expiredAt?: string;
  deliveredAt?: string;
  voiceNoteUrl?: string;
  pdfUrl?: string;
  emailsFired?: EmailFiredEntry[];
  reading: {
    slug: string;
    name: string;
    priceDisplay: string;
  } | null;
  amountPaidCents: number | null;
  amountPaidCurrency: string | null;
  recipientUserId: string | null;
};
