// Seeds the IntakeForm localStorage draft for the recipient claim leg. Keys
// by `gift-redeem.<submissionId>` because IntakeForm in redeem mode rewrites
// its storage key (see IntakeForm.tsx).
import type { Page } from "@playwright/test";

const DRAFT_KEY_PREFIX = "josephine.intake.draft.";
const DRAFT_VERSION = 1;

type DraftValues = Record<string, string | string[] | boolean>;

const RECIPIENT_INTAKE_DEFAULTS: DraftValues = {
  // Letter-only name fields enforce /^[A-Za-z…'\-\s.]+$/ at the schema level.
  first_name: "Mira",
  middle_name: "",
  last_name: "Veil",
  date_of_birth: "1988-09-12",
  time_of_birth: "unknown",
  time_of_birth_unknown: true,
  place_of_birth: "Paris, France",
  place_of_birth_geonameid: "2988507",
  focus_questions: [
    "soul_purpose_lifetime",
    "highest_timeline",
    "embody_higher_self",
  ],
  anything_else: "",
};

/**
 * Seeds the IntakeForm draft for a recipient redeeming a gift. The form's
 * storage key in redeem mode is `josephine.intake.draft.gift-redeem.<id>`.
 * The recipient's email is NOT seeded — the redeem flow takes it from the
 * gift-claim cookie rather than the form.
 */
export async function seedGiftIntakeDraft(
  page: Page,
  submissionId: string,
  options: { recipientEmail: string; values?: DraftValues } = {
    recipientEmail: "",
  },
): Promise<void> {
  const envelope = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    currentPage: 0,
    values: {
      ...RECIPIENT_INTAKE_DEFAULTS,
      email: options.recipientEmail,
      ...options.values,
    },
  };
  await page.addInitScript(
    ({ key, raw }) => {
      window.localStorage.setItem(key, raw);
    },
    {
      key: `${DRAFT_KEY_PREFIX}gift-redeem.${submissionId}`,
      raw: JSON.stringify(envelope),
    },
  );
}
