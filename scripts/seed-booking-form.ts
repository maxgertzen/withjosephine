/**
 * Seed the bookingForm singleton + the v6 "Vellum & Letter" form structure
 * (sections, fields, options) into Sanity.
 *
 * Idempotent. Uses createIfNotExists with stable IDs so:
 *   - Re-runs are no-ops for anything already present
 *   - Studio edits are NEVER overwritten
 *
 * The v6 form supports three readings (soul-blueprint, akashic-record,
 * birth-chart) via per-section appliesToServices gating, and per-reading
 * pagination via bookingForm.pagination.overrides.
 *
 * Run:
 *   set -a && source .env.local && set +a && pnpm tsx scripts/seed-booking-form.ts
 */
import { createClient, type IdentifiedSanityDocumentStub } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const READING_SOUL_BLUEPRINT = "reading-soul-blueprint";
const READING_AKASHIC = "reading-akashic-record";
const READING_BIRTH_CHART = "reading-birth-chart";

const BOOKING_FORM_ID = "bookingForm";
const LEGACY_SECTION_ID = "formSection-about";

type FieldOption = {
  _key: string;
  value: string;
  label: string;
  category?: string;
  categoryOrder?: number;
  nameFollowup?: { enabled: boolean; label?: string; placeholder?: string };
};

type SeedFormField = {
  _id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  system: boolean;
  order: number;
  placeholder?: string;
  helpText?: string;
  helperPosition?: "before" | "after";
  iconKey?: string;
  clarificationNote?: string;
  multiSelectCount?: number;
  options?: FieldOption[];
  appliesToServices?: string[];
  fileUploadConfig?: {
    mimeTypes: string[];
    maxSizeMb: number;
    exifStrip: boolean;
  };
  placeAutocompleteSource?: { provider: "geonames-static" | "geoapify" | "none" };
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternErrorMessage?: string;
  };
};

type SeedFormSection = {
  _id: string;
  sectionTitle: string;
  sectionDescription?: string;
  clarificationNote?: string;
  transitionLine?: string;
  pageBoundary?: boolean;
  marginaliaLabel?: string;
  fieldRefs: string[];
  appliesToServices?: string[];
  order: number;
};

const NAME_FOLLOWUP = {
  enabled: true,
  label: "Their name —",
  placeholder: "Their first name",
};

const FIELDS: SeedFormField[] = [
  {
    _id: "formField-fullName",
    key: "fullName",
    label: "Full name",
    type: "shortText",
    required: true,
    system: true,
    order: 10,
  },
  {
    _id: "formField-email",
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    system: true,
    order: 20,
    helpText: "I'll send your reading to this address.",
    validation: { maxLength: 254 },
  },
  {
    _id: "formField-agreement",
    key: "agreement",
    label:
      "I understand readings are non-refundable once my intake form is submitted, and I agree.",
    type: "consent",
    required: true,
    system: true,
    order: 30,
  },
  {
    _id: "formField-legalFullName",
    key: "legal_full_name",
    label: "Legal full name",
    type: "shortText",
    required: false,
    system: true,
    order: 40,
    validation: { minLength: 1, maxLength: 200 },
  },
  {
    _id: "formField-firstName",
    key: "first_name",
    label: "First name",
    type: "shortText",
    required: true,
    system: true,
    order: 41,
    validation: {
      minLength: 1,
      maxLength: 80,
      pattern: "^[A-Za-z\\u00C0-\\u017F'\\-\\s.]+$",
      patternErrorMessage: "Please use letters only — no numbers or symbols.",
    },
  },
  {
    _id: "formField-middleName",
    key: "middle_name",
    label: "Middle name",
    type: "shortText",
    required: false,
    system: true,
    order: 42,
    helpText: "Optional",
    validation: {
      maxLength: 80,
      pattern: "^[A-Za-z\\u00C0-\\u017F'\\-\\s.]*$",
      patternErrorMessage: "Please use letters only — no numbers or symbols.",
    },
  },
  {
    _id: "formField-lastName",
    key: "last_name",
    label: "Last name",
    type: "shortText",
    required: true,
    system: true,
    order: 43,
    validation: {
      minLength: 1,
      maxLength: 80,
      pattern: "^[A-Za-z\\u00C0-\\u017F'\\-\\s.]+$",
      patternErrorMessage: "Please use letters only — no numbers or symbols.",
    },
  },
  {
    _id: "formField-photo",
    key: "photo",
    label: "A photo of yourself with your eyes open",
    type: "fileUpload",
    required: true,
    system: true,
    order: 50,
    iconKey: "camera",
    helperPosition: "before",
    helpText:
      "A natural photo is fine — phone selfie, no makeup needed. What matters is that I can see your eyes. The image stays private and is used only to attune to your energy.",
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_AKASHIC],
    fileUploadConfig: {
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      maxSizeMb: 8,
      exifStrip: true,
    },
  },
  {
    _id: "formField-dateOfBirth",
    key: "date_of_birth",
    label: "Date of birth",
    type: "date",
    required: true,
    system: true,
    order: 60,
    iconKey: "calendar",
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_BIRTH_CHART],
  },
  {
    _id: "formField-timeOfBirth",
    key: "time_of_birth",
    label: "Time of birth",
    type: "time",
    required: true,
    system: true,
    order: 70,
    iconKey: "clock",
    helpText: "As accurate as possible.",
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_BIRTH_CHART],
  },
  {
    _id: "formField-timeOfBirthUnknown",
    key: "time_of_birth_unknown",
    label: "I don't know my birth time",
    type: "consent",
    required: false,
    system: true,
    order: 75,
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_BIRTH_CHART],
  },
  {
    _id: "formField-placeOfBirth",
    key: "place_of_birth",
    label: "Place of birth",
    type: "placeAutocomplete",
    required: true,
    system: true,
    order: 80,
    iconKey: "map-pin",
    placeholder: "Town and country",
    placeAutocompleteSource: { provider: "geonames-static" },
    validation: { minLength: 2, maxLength: 200 },
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_BIRTH_CHART],
  },
  {
    _id: "formField-focusQuestions",
    key: "focus_questions",
    label: "Please choose 3 questions you would like explored in your reading.",
    type: "multiSelectExact",
    required: true,
    system: true,
    order: 90,
    multiSelectCount: 3,
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_AKASHIC],
    options: [
      // Category 1 — Soul Purpose & Life Direction
      { _key: "soul_purpose_lifetime", value: "soul_purpose_lifetime", label: "What is my soul purpose in this lifetime?", category: "Soul Purpose & Life Direction", categoryOrder: 1 },
      { _key: "purpose_holding_back", value: "purpose_holding_back", label: "What is holding me back from fully stepping into my purpose?", category: "Soul Purpose & Life Direction", categoryOrder: 1 },
      { _key: "highest_timeline", value: "highest_timeline", label: "What actions will bring me closer to my highest timeline?", category: "Soul Purpose & Life Direction", categoryOrder: 1 },
      { _key: "embody_higher_self", value: "embody_higher_self", label: "How can I embody my higher self more fully?", category: "Soul Purpose & Life Direction", categoryOrder: 1 },
      // Category 2 — Karmic Patterns & Ancestral Healing
      { _key: "past_life_affecting", value: "past_life_affecting", label: "What past life experiences are affecting me in this lifetime?", category: "Karmic Patterns & Ancestral Healing", categoryOrder: 2 },
      { _key: "karmic_patterns", value: "karmic_patterns", label: "What karmic patterns am I here to break or transform?", category: "Karmic Patterns & Ancestral Healing", categoryOrder: 2 },
      { _key: "ancestral_wounding", value: "ancestral_wounding", label: "What ancestral wounding have I come to heal?", category: "Karmic Patterns & Ancestral Healing", categoryOrder: 2 },
      { _key: "ancestral_contribution", value: "ancestral_contribution", label: "What is my contribution to my ancestral line?", category: "Karmic Patterns & Ancestral Healing", categoryOrder: 2 },
      // Category 3 — Abundance, Worth & Receiving
      { _key: "blocking_abundance", value: "blocking_abundance", label: "Where am I unconsciously blocking abundance?", category: "Abundance, Worth & Receiving", categoryOrder: 3 },
      { _key: "limiting_beliefs_money", value: "limiting_beliefs_money", label: "What limiting beliefs have I inherited around money or worth?", category: "Abundance, Worth & Receiving", categoryOrder: 3 },
      { _key: "receiving_shift", value: "receiving_shift", label: "What shift in belief will open me to receiving more fully?", category: "Abundance, Worth & Receiving", categoryOrder: 3 },
      // Category 4 — Relationships & Love (two with name follow-up)
      { _key: "soul_contract_name", value: "soul_contract_name", label: "What is the nature of my soul contract with [their name]?", category: "Relationships & Love", categoryOrder: 4, nameFollowup: NAME_FOLLOWUP },
      { _key: "past_life_name", value: "past_life_name", label: "Have I shared a past life with [their name] and if so what are we here to learn?", category: "Relationships & Love", categoryOrder: 4, nameFollowup: NAME_FOLLOWUP },
      { _key: "opening_to_love", value: "opening_to_love", label: "What is holding me back from opening fully to love?", category: "Relationships & Love", categoryOrder: 4 },
      { _key: "sabotaging_relationships", value: "sabotaging_relationships", label: "How am I unconsciously sabotaging my relationships?", category: "Relationships & Love", categoryOrder: 4 },
      // Category 5 — Spiritual Gifts & Intuition
      { _key: "spiritual_gifts", value: "spiritual_gifts", label: "What spiritual gifts did I come into this lifetime with?", category: "Spiritual Gifts & Intuition", categoryOrder: 5 },
      { _key: "trusting_intuition", value: "trusting_intuition", label: "What is blocking me from fully trusting my intuition?", category: "Spiritual Gifts & Intuition", categoryOrder: 5 },
      { _key: "connection_guides", value: "connection_guides", label: "What is my connection to my guides or higher self?", category: "Spiritual Gifts & Intuition", categoryOrder: 5 },
    ],
  },
  {
    _id: "formField-anythingElse",
    key: "anything_else",
    label: "Is there anything else you would like me to know before your reading?",
    type: "longText",
    required: false,
    system: true,
    order: 100,
    placeholder: "Drop a sentence or two — or leave it blank.",
    helpText: "A sentence is plenty. Skip it if nothing comes.",
    validation: { minLength: 0, maxLength: 2000 },
  },
];

const SECTIONS: SeedFormSection[] = [
  {
    _id: "formSection-page1-system",
    sectionTitle: "Two quick details to start.",
    transitionLine: "First — so I can find you in the records.",
    marginaliaLabel: "Your name",
    pageBoundary: false,
    order: 10,
    fieldRefs: [
      "formField-email",
      "formField-firstName",
      "formField-middleName",
      "formField-lastName",
    ],
  },
  {
    _id: "formSection-photo",
    sectionTitle: "Your photo",
    transitionLine: "Now your photo, and the day you arrived.",
    clarificationNote:
      "✦ Akashic Records are an energetic library of your soul's history — these details help me locate you there.",
    marginaliaLabel: "Photo",
    pageBoundary: true,
    order: 20,
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_AKASHIC],
    fieldRefs: ["formField-photo"],
  },
  {
    _id: "formSection-birth",
    sectionTitle: "I need the following to connect to your energy and read your chart:",
    clarificationNote:
      "✦ If you can find your exact birth time, the reading goes deeper — houses and rising sign need it. Without it, I'll work with what I have and tell you what's missing.",
    marginaliaLabel: "Birth",
    pageBoundary: false,
    order: 30,
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_BIRTH_CHART],
    fieldRefs: [
      "formField-dateOfBirth",
      "formField-timeOfBirth",
      "formField-timeOfBirthUnknown",
      "formField-placeOfBirth",
    ],
  },
  {
    _id: "formSection-questions",
    sectionTitle: "Please choose 3 questions you would like explored in your reading.",
    transitionLine: "These are the questions I'll sit with.",
    clarificationNote:
      "✦ Some relationship questions ask for a specific person's name. If you choose one, a small field will appear beneath where you can write it.",
    marginaliaLabel: "Questions",
    pageBoundary: true,
    order: 40,
    appliesToServices: [READING_SOUL_BLUEPRINT, READING_AKASHIC],
    fieldRefs: ["formField-focusQuestions"],
  },
  {
    _id: "formSection-anythingElse",
    sectionTitle: "Is there anything else you would like me to know before your reading?",
    transitionLine: "And anything else you want me to carry into the reading.",
    sectionDescription: "Optional — only if it feels right.",
    marginaliaLabel: "Anything else",
    pageBoundary: true,
    order: 50,
    fieldRefs: ["formField-anythingElse"],
  },
];

const PAGINATION_OVERRIDES = [
  { _key: "akashic", readingSlug: "akashic-record", pageCount: 2 },
  { _key: "birth-chart", readingSlug: "birth-chart", pageCount: 1 },
];

function toReadingRefs(ids: string[] | undefined) {
  if (!ids || ids.length === 0) return undefined;
  return ids.map((id) => ({ _key: id, _type: "reference" as const, _ref: id }));
}

async function seedFields() {
  const existing = await client.fetch<Array<{ _id: string }>>(
    '*[_type == "formField"]{ _id }',
  );
  for (const field of FIELDS) {
    const wasThere = existing.some((row) => row._id === field._id);
    const { appliesToServices, ...rest } = field;
    const stub: IdentifiedSanityDocumentStub = {
      _type: "formField",
      ...rest,
      ...(appliesToServices ? { appliesToServices: toReadingRefs(appliesToServices) } : {}),
    };
    await client.createIfNotExists(stub);
    console.log(`${wasThere ? "SKIP  " : "CREATE"} formField   ${field._id}`);
  }
}

async function seedSections() {
  const existing = await client.fetch<Array<{ _id: string }>>(
    '*[_type == "formSection"]{ _id }',
  );
  for (const section of SECTIONS) {
    const wasThere = existing.some((row) => row._id === section._id);
    const { fieldRefs, appliesToServices, ...rest } = section;
    const stub: IdentifiedSanityDocumentStub = {
      _type: "formSection",
      ...rest,
      ...(appliesToServices ? { appliesToServices: toReadingRefs(appliesToServices) } : {}),
      fields: fieldRefs.map((ref) => ({ _key: ref, _type: "reference", _ref: ref })),
    };
    await client.createIfNotExists(stub);
    console.log(`${wasThere ? "SKIP  " : "CREATE"} formSection ${section._id}`);
  }
}

async function seedBookingForm() {
  const existingForm = await client.fetch<{
    _id: string;
    sections?: Array<{ _ref: string }>;
    pagination?: { overrides?: Array<{ readingSlug?: string }> };
  } | null>(
    '*[_type == "bookingForm" && _id == $id][0]{ _id, sections, pagination }',
    { id: BOOKING_FORM_ID },
  );

  if (!existingForm) {
    const stub: IdentifiedSanityDocumentStub = {
      _id: BOOKING_FORM_ID,
      _type: "bookingForm",
      title: "Booking Form",
      sections: SECTIONS.map((s) => ({
        _key: s._id,
        _type: "reference",
        _ref: s._id,
      })),
      pagination: { overrides: PAGINATION_OVERRIDES },
      nonRefundableNotice:
        "Once you submit your intake, your reading is non-refundable. By continuing you agree to this.",
    };
    await client.createIfNotExists(stub);
    console.log(`CREATE bookingForm  ${BOOKING_FORM_ID}`);
    return;
  }

  console.log(`SKIP   bookingForm  ${BOOKING_FORM_ID} (exists; checking sections + pagination)`);

  const currentRefs = existingForm.sections?.map((s) => s._ref) ?? [];
  const isLegacyOnly =
    currentRefs.length === 0 ||
    (currentRefs.length === 1 && currentRefs[0] === LEGACY_SECTION_ID);

  if (isLegacyOnly) {
    const sectionRefs = SECTIONS.map((s) => ({
      _key: s._id,
      _type: "reference",
      _ref: s._id,
    }));
    await client.patch(BOOKING_FORM_ID).set({ sections: sectionRefs }).commit();
    console.log(
      `  PATCH  bookingForm.sections (was ${currentRefs.length === 0 ? "empty" : "legacy-only"}; set to v6 list)`,
    );
  } else {
    const v6Refs = new Set(SECTIONS.map((s) => s._id));
    const hasAnyV6 = currentRefs.some((ref) => v6Refs.has(ref));
    if (!hasAnyV6) {
      console.log(
        `  WARN   bookingForm.sections has Studio edits but no v6 sections; leaving alone. Manual review needed.`,
      );
    } else {
      console.log(`  OK     bookingForm.sections already references v6 sections`);
    }
  }

  const overridesPresent =
    existingForm.pagination?.overrides && existingForm.pagination.overrides.length > 0;
  if (!overridesPresent) {
    await client
      .patch(BOOKING_FORM_ID)
      .setIfMissing({ pagination: { overrides: PAGINATION_OVERRIDES } })
      .commit();
    console.log(`  PATCH  bookingForm.pagination.overrides (seeded ${PAGINATION_OVERRIDES.length})`);
  } else {
    console.log(`  SKIP   bookingForm.pagination.overrides (Studio-managed)`);
  }
}

async function main() {
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }

  console.log("[1/3] Seeding formField docs...");
  await seedFields();

  console.log("\n[2/3] Seeding formSection docs...");
  await seedSections();

  console.log("\n[3/3] Wiring bookingForm singleton...");
  await seedBookingForm();

  console.log("\nDone.");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nFAILED: ${message}`);
  process.exit(1);
});
