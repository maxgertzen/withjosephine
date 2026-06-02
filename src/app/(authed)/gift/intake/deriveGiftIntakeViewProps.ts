import { GIFT_INTAKE_PAGE_DEFAULTS } from "@/data/defaults";
import { purchaserSuppliedRecipientName } from "@/lib/booking/giftPersonas";
import { filterSectionsForReading } from "@/lib/booking/sectionFilters";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { pickDefined } from "@/lib/sanity/pickDefined";
import type {
  SanityBookingForm,
  SanityGiftIntakePage,
  SanityReading,
} from "@/lib/sanity/types";

import type { GiftIntakeViewProps } from "./GiftIntakeView";

export type DeriveGiftIntakeViewPropsInput = {
  submission: SubmissionRecord;
  reading: SanityReading;
  bookingForm: SanityBookingForm;
  intakePageCopy: SanityGiftIntakePage | null;
  welcome: boolean;
};

export function deriveGiftIntakeViewProps(
  input: DeriveGiftIntakeViewPropsInput,
): GiftIntakeViewProps {
  const copy = { ...GIFT_INTAKE_PAGE_DEFAULTS, ...pickDefined(input.intakePageCopy ?? {}) };
  const readingName = input.reading.name;
  const lede = copy.lede.replaceAll("{readingName}", () => readingName);

  // {recipientName} substitution is welcome-path only: the non-welcome heading
  // never advertised the token, so a literal `{recipientName}` left there
  // renders as text rather than as a leaky empty string.
  const recipientNameToken = purchaserSuppliedRecipientName(input.submission) ?? "";
  const heading = input.welcome
    ? copy.headingWelcome.replaceAll("{recipientName}", () => recipientNameToken)
    : copy.heading;

  const sections = filterSectionsForReading(input.bookingForm.sections, input.reading.slug);

  return {
    submissionId: input.submission._id,
    recipientEmail: input.submission.recipientEmail ?? null,
    eyebrow: copy.eyebrow,
    heading,
    lede,
    readingSlug: input.reading.slug,
    readingName,
    sections,
    pagination: input.bookingForm.pagination,
    formLabels: {
      nextLabel: input.bookingForm.nextButtonText,
      saveLaterLabel: input.bookingForm.saveAndContinueLaterText,
      pageIndicatorTagline: input.bookingForm.pageIndicatorTagline,
    },
  };
}
