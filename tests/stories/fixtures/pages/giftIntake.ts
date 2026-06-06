import bookingFormFixture from "@/__fixtures__/sanity/e2e/bookingForm.json";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import type { SanityFormSection, SanityPagination } from "@/lib/sanity/types";

const sections = bookingFormFixture.sections as unknown as SanityFormSection[];
const pagination = bookingFormFixture.pagination as SanityPagination;

export const GIFT_INTAKE_SUBMISSION_ID = "sub_storybook_gift_redeem";

export const GIFT_INTAKE_BASE_ARGS = {
  submissionId: GIFT_INTAKE_SUBMISSION_ID,
  recipientEmail: "recipient@example.com" as string | null,
  eyebrow: "✦ Opening your gift",
  heading: "A few things, before we begin.",
  lede: "Someone sent you a Soul Blueprint. Share your details and Josephine will prepare your reading.",
  readingSlug: "soul-blueprint",
  readingName: "Soul Blueprint",
  sections: filterSectionsForReading(sections, "soul-blueprint"),
  pagination,
  formLabels: {
    nextLabel: bookingFormFixture.nextButtonText ?? "Next",
    saveLaterLabel: bookingFormFixture.saveAndContinueLaterText ?? "Save & continue later",
    pageIndicatorTagline: bookingFormFixture.pageIndicatorTagline ?? "",
  },
};

export const GIFT_INTAKE_WELCOME_ARRIVAL_HEADING = "Welcome, a few things before we begin.";
