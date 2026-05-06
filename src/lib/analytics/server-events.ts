// Mirrors ./events.ts; snake_case keys match the client-side taxonomy.

export type EmailSubType =
  | "order_confirmation"
  | "josephine_notification"
  | "day_2"
  | "day_7_delivery"
  | "day_7_overdue_alert"
  | "contact_form";

export type ServerEventMap = {
  payment_success: {
    submission_id: string;
    reading_id: string;
    amount_paid_cents: number | null;
    currency: string | null;
    stripe_session_id: string;
  };
  payment_expired: {
    submission_id: string;
    reading_id: string;
    stripe_session_id: string;
  };
  email_sent: {
    sub_type: EmailSubType;
    submission_id: string | null;
    recipient_redacted: string;
    resend_id_present: boolean;
  };
  delivery_listened: {
    submission_id: string;
    reading_id: string;
  };
  pricing_drift_detected: {
    reading_slug: string;
    price_cents: number;
    price_display: string;
    parsed_display_cents: number | null;
  };
};

export type ServerEventName = keyof ServerEventMap;
