import { BOOKING_GIFT_FORM_DEFAULTS } from "@/data/defaults";

export const GIFT_FORM_STORY_BASE_ARGS = {
  readingSlug: "soul-blueprint",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  copy: BOOKING_GIFT_FORM_DEFAULTS,
};

export const GIFT_FORM_SOUL_BLUEPRINT_ARGS = {};

export const GIFT_FORM_BIRTH_CHART_ARGS = {
  readingSlug: "birth-chart",
  readingName: "Birth Chart Reading",
  readingPriceDisplay: "$99",
};

export const GIFT_FORM_AKASHIC_RECORD_ARGS = {
  readingSlug: "akashic-record",
  readingName: "Akashic Record Reading",
  readingPriceDisplay: "$79",
};

export const GIFT_FORM_CUSTOM_COPY_ARGS = {
  copy: {
    ...BOOKING_GIFT_FORM_DEFAULTS,
    heading: "Give the gift of a reading.",
    subheading: "A few details and it's on its way.",
    consentIntro: "By giving this gift, you confirm the following:",
    submitButtonSelfSend: "Send me the gift link",
    submitButtonScheduled: "Schedule the gift",
  },
};
