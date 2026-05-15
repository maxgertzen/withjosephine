import type { Page } from "@playwright/test";

const DRAFT_KEY_PREFIX = "josephine.intake.draft.";
const DRAFT_VERSION = 1;

type DraftValues = Record<string, string | string[] | boolean>;

const FULL_INTAKE_DEFAULTS: DraftValues = {
  email: "e2e-test@withjosephine.com",
  // Letter-only name fields enforce /^[A-Za-z…'\-\s.]+$/ at the schema level —
  // avoid digits/symbols here or `currentPageValid` won't flip true.
  first_name: "Ada",
  middle_name: "",
  last_name: "Lovelace",
  date_of_birth: "1992-04-21",
  time_of_birth: "unknown",
  time_of_birth_unknown: true,
  place_of_birth: "London, United Kingdom",
  place_of_birth_geonameid: "2643743",
  focus_questions: [
    "soul_purpose_lifetime",
    "highest_timeline",
    "embody_higher_self",
  ],
  anything_else: "",
};

export async function seedIntakeDraft(
  page: Page,
  readingSlug: string,
  options: { currentPage?: number; values?: DraftValues } = {},
): Promise<void> {
  const envelope = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    currentPage: options.currentPage ?? 0,
    values: { ...FULL_INTAKE_DEFAULTS, ...options.values },
  };
  await page.addInitScript(
    ({ key, raw }) => {
      window.localStorage.setItem(key, raw);
    },
    {
      key: `${DRAFT_KEY_PREFIX}${readingSlug}`,
      raw: JSON.stringify(envelope),
    },
  );
}

export async function waitForDraftRestore(page: Page): Promise<void> {
  // `currentPageValid` (which enables both Next and Submit) only flips true
  // after the IntakeForm's mount-time `restoreDraft` populates state. Wait
  // for the email input value to land before clicking anything.
  await page.locator("#field-email").evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        const check = () => {
          if ((el as HTMLInputElement).value !== "") return resolve();
          setTimeout(check, 50);
        };
        check();
      }),
  );
}

export async function clickThroughIntakePages(
  page: Page,
  expectedPageCount: number,
): Promise<void> {
  await waitForDraftRestore(page);
  for (let i = 0; i < expectedPageCount; i++) {
    if ((await page.getByTestId("intake-submit").count()) > 0) return;
    await page.getByTestId("intake-next").click();
  }
}
