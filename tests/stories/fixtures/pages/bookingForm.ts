import { ENTRY_PAGE_DEFAULTS } from "@/data/defaults";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
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

const BASE_COPY = {
  title: "A few things, before we begin.",
  letterOpener: ENTRY_PAGE_DEFAULTS.letterOpener,
  letterBridge: ENTRY_PAGE_DEFAULTS.letterBridge,
};

export const BOOKING_FORM_SOUL_BLUEPRINT_ARGS = {
  backHref: "/#reading-soul-blueprint",
  reading: {
    slug: "soul-blueprint",
    tag: "Signature",
    name: "Soul Blueprint",
    priceLabel: "$129",
  },
  copy: {
    ...BASE_COPY,
    subtitle: "Take your time. The more honestly you write, the more your reading can hold.",
  },
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
  copy: {
    ...BASE_COPY,
    subtitle: "For a Birth Chart, I only need the moment you arrived here.",
  },
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
  copy: {
    ...BASE_COPY,
    subtitle: "For the records, I’ll need your name, your photo, and three questions.",
  },
  form: { ...BASE_FORM, sections: filterSectionsForReading(sections, "akashic-record") },
};
