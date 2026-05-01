/**
 * Event taxonomy from SPEC §15. Properties are snake_case in the
 * implementation per Mixpanel's tracking-plan convention; SPEC §15
 * documents them in camelCase as a human-readable list. The mapping
 * is one-to-one and lives only at this boundary — call sites use
 * snake_case throughout.
 *
 * Adding a new event MUST update this file. The `track()` API is
 * typed against `ClientEventMap` so call sites stay honest.
 *
 * `abandoned_recovered` is intentionally absent — abandonment-recovery
 * was dropped from Phase 1 per project decisions (would touch users
 * who never reached the consent step).
 */

/**
 * Reading identifier — the Sanity slug. Typed as `string` rather than a
 * literal union because Josephine can add new readings in Studio
 * without a code change; analytics call sites accept whatever comes
 * from URL params or Sanity.
 */
export type ReadingId = string;

export type EntryCtaPosition = "drop-cap" | "verso-cta" | "back-link";

export type EmailType =
  | "order_confirmation"
  | "day2"
  | "day7"
  | "day14"
  | "abandonment";

/**
 * Client-side events (PR-F1). Server-side events live under
 * `ServerEventMap` and ship in PR-F2.
 */
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
};

export type ClientEventName = keyof ClientEventMap;
