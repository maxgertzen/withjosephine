import { INTAKE_INTRO_BY_SLUG, INTAKE_TITLE_FALLBACK } from "@/data/defaults";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import type { SanityFormSection, SanityPagination } from "@/lib/sanity/types";

import bookingFormFixture from "../../../../src/__fixtures__/sanity/e2e/bookingForm.json";

const sections = bookingFormFixture.sections as unknown as SanityFormSection[];
const pagination = bookingFormFixture.pagination as SanityPagination;

const BASE_FORM = {
  pagination,
  nonRefundableNotice: bookingFormFixture.nonRefundableNotice ?? "",
  loadingStateCopy: bookingFormFixture.loadingStateCopy ?? "",
  pageIndicatorTagline: bookingFormFixture.pageIndicatorTagline ?? "",
  nextLabel: bookingFormFixture.nextButtonText ?? "Next",
  saveLaterLabel: bookingFormFixture.saveAndContinueLaterText ?? "Save & continue later",
  submitLabel: "Continue to payment",
};

const BASE_COPY = { title: INTAKE_TITLE_FALLBACK };

export const BOOKING_FORM_SOUL_BLUEPRINT_ARGS = {
  backHref: "/#reading-soul-blueprint",
  reading: {
    slug: "soul-blueprint",
    tag: "Signature",
    name: "Soul Blueprint",
    priceLabel: "$129",
  },
  copy: { ...BASE_COPY, intro: paragraphBlocks(INTAKE_INTRO_BY_SLUG["soul-blueprint"]) },
  form: { ...BASE_FORM, sections: filterSectionsForReading(sections, "soul-blueprint") },
};

export const BOOKING_FORM_BIRTH_CHART_ARGS = {
  backHref: "/#reading-birth-chart",
  reading: {
    slug: "birth-chart",
    tag: "Astrology",
    name: "Birth Chart Reading",
    priceLabel: "$89",
  },
  copy: { ...BASE_COPY, intro: paragraphBlocks(INTAKE_INTRO_BY_SLUG["birth-chart"]) },
  form: { ...BASE_FORM, sections: filterSectionsForReading(sections, "birth-chart") },
};

export const BOOKING_FORM_AKASHIC_RECORD_ARGS = {
  backHref: "/#reading-akashic-record",
  reading: {
    slug: "akashic-record",
    tag: "Soul Records",
    name: "Akashic Records Reading",
    priceLabel: "$89",
  },
  copy: { ...BASE_COPY, intro: paragraphBlocks(INTAKE_INTRO_BY_SLUG["akashic-record"]) },
  form: { ...BASE_FORM, sections: filterSectionsForReading(sections, "akashic-record") },
};
