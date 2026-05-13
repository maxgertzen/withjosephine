// Property keys are snake_case in the implementation (SPEC §15 documents them
// in camelCase). abandoned_recovered is intentionally absent.

export type ReadingId = string;

export type EntryCtaPosition = "drop-cap" | "verso-cta" | "back-link";

export type EmailType =
  | "order_confirmation"
  | "day2"
  | "day7"
  | "day14"
  | "abandonment";

export type ClientEventMap = {
  entry_page_view: {
    reading_id: ReadingId;
    referrer: string;
    viewport_width: number;
  };
  cta_click_intake: {
    reading_id: ReadingId;
    position: EntryCtaPosition;
  };
  change_reading_click: {
    from_reading_id: ReadingId;
  };
  intake_page_view: {
    reading_id: ReadingId;
    page_number: number;
    total_pages: number;
  };
  intake_field_first_focus: {
    reading_id: ReadingId;
    field_key: string;
    page_number: number;
  };
  intake_page_next_click: {
    reading_id: ReadingId;
    page_number: number;
    validation_pass: boolean;
  };
  intake_page_back_click: {
    reading_id: ReadingId;
    from_page: number;
    to_page: number;
  };
  intake_save_click: {
    reading_id: ReadingId;
    page_number: number;
  };
  intake_save_auto: {
    reading_id: ReadingId;
    page_number: number;
  };
  intake_clear_draft_click: {
    reading_id: ReadingId;
    page_number: number;
  };
  intake_submit_click: {
    reading_id: ReadingId;
    validation_pass: boolean;
  };
  intake_submit_success: {
    reading_id: ReadingId;
  };
  intake_submit_error: {
    reading_id: ReadingId;
    error_code: string;
  };
  stripe_redirect: {
    reading_id: ReadingId;
    submission_id: string;
  };
  gift_toggle_selected: {
    reading_id: ReadingId;
    mode: "for_me" | "as_gift";
  };
  gift_submit_click: {
    reading_id: ReadingId;
    delivery_method: "self_send" | "scheduled";
    validation_pass: boolean;
  };
  gift_submit_success: {
    reading_id: ReadingId;
    delivery_method: "self_send" | "scheduled";
  };
  gift_submit_error: {
    reading_id: ReadingId;
    delivery_method: "self_send" | "scheduled";
    error_code: string;
  };
};

export type ClientEventName = keyof ClientEventMap;
