import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import type { SanityFormSection, SanityPagination } from "@/lib/sanity/types";

import bookingFormFixture from "../../../../src/__fixtures__/sanity/e2e/bookingForm.json";

const sections = bookingFormFixture.sections as unknown as SanityFormSection[];
const pagination = bookingFormFixture.pagination as SanityPagination;

export const INTAKE_FORM_STORY_BASE_ARGS = {
  sections,
  pagination,
  readingId: "soul-blueprint",
  readingName: "Soul Blueprint",
  nonRefundableNotice: bookingFormFixture.nonRefundableNotice ?? "",
  loadingStateCopy: bookingFormFixture.loadingStateCopy ?? "",
  pageIndicatorTagline: bookingFormFixture.pageIndicatorTagline ?? "",
  nextLabel: bookingFormFixture.nextButtonText ?? "Next",
  saveLaterLabel: bookingFormFixture.saveAndContinueLaterText ?? "Save & continue later",
  submitLabel: "Continue to payment",
};

export const INTAKE_FORM_SOUL_BLUEPRINT_ARGS = {
  ...INTAKE_FORM_STORY_BASE_ARGS,
  sections: filterSectionsForReading(sections, "soul-blueprint"),
  readingId: "soul-blueprint",
  readingName: "Soul Blueprint",
};

export const INTAKE_FORM_AKASHIC_RECORD_ARGS = {
  ...INTAKE_FORM_STORY_BASE_ARGS,
  sections: filterSectionsForReading(sections, "akashic-record"),
  readingId: "akashic-record",
  readingName: "Akashic Record Reading",
};

export const INTAKE_FORM_BIRTH_CHART_ARGS = {
  ...INTAKE_FORM_STORY_BASE_ARGS,
  sections: filterSectionsForReading(sections, "birth-chart"),
  readingId: "birth-chart",
  readingName: "Birth Chart Reading",
};

export const INTAKE_FORM_REDEEM_MODE_ARGS = {
  ...INTAKE_FORM_STORY_BASE_ARGS,
  sections: filterSectionsForReading(sections, "soul-blueprint"),
  mode: "redeem" as const,
  redeemSubmissionId: "sub_storybook_redeem",
  prefilledEmail: "recipient@example.com",
  submitLabel: "Submit intake",
};
