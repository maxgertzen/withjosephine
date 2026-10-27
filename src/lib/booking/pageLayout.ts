export const BOOKING_PAGE_ELEMENTS = [
  { key: "summary", title: "Small label, promise and description" },
  { key: "facts", title: "Facts row" },
  { key: "reader", title: "Reader name and photo" },
  { key: "included", title: "What's included" },
  { key: "howItWorks", title: "How it works" },
  { key: "giftRow", title: "Gift row" },
  { key: "questions", title: "Questions and answers (FAQ)" },
  { key: "intro", title: "Form heading and opening words" },
  { key: "testimonial", title: "Testimonial" },
  { key: "form", title: "The form" },
  { key: "otherReadings", title: "Not sure this is the one?" },
  { key: "notes", title: "Notes" },
] as const;

export type BookingPageElement = (typeof BOOKING_PAGE_ELEMENTS)[number]["key"];

export type BookingPageLayoutEntry = { element?: string | null };

export type BookingPageVisibility = {
  hiddenEverywhere?: readonly string[] | null;
  hiddenOnReading?: readonly string[] | null;
  testimonialInsideForm?: boolean | null;
};

export type BookingPageLayout = {
  aboveForm: BookingPageElement[];
  belowForm: BookingPageElement[];
  testimonialInsideForm: boolean;
};

export const DEFAULT_ORDER: BookingPageElement[] = BOOKING_PAGE_ELEMENTS.map(({ key }) => key);

export const HIDEABLE_ELEMENTS = BOOKING_PAGE_ELEMENTS.filter(({ key }) => key !== "form");

function isBookingPageElement(value: unknown): value is BookingPageElement {
  return DEFAULT_ORDER.includes(value as BookingPageElement);
}

type KnownLayoutEntry = { element: BookingPageElement };

export function defaultBookingPageLayoutEntries(): KnownLayoutEntry[] {
  return DEFAULT_ORDER.map((element) => ({ element }));
}

function knownEntriesOnce(entries: BookingPageLayoutEntry[]): KnownLayoutEntry[] {
  const seen = new Set<BookingPageElement>();
  const known: KnownLayoutEntry[] = [];
  for (const entry of entries) {
    if (!isBookingPageElement(entry.element) || seen.has(entry.element)) continue;
    seen.add(entry.element);
    known.push({ element: entry.element });
  }
  return known;
}

export function normalizeLayoutEntries(entries: BookingPageLayoutEntry[]): KnownLayoutEntry[] {
  const result = knownEntriesOnce(entries);
  const has = (element: BookingPageElement) => result.some((entry) => entry.element === element);
  DEFAULT_ORDER.forEach((element, defaultIndex) => {
    if (has(element)) return;
    const previous = DEFAULT_ORDER.slice(0, defaultIndex).reverse().find(has);
    const insertAt = previous ? result.findIndex((entry) => entry.element === previous) + 1 : 0;
    result.splice(insertAt, 0, { element });
  });
  return result;
}

export function chooseLayoutEntries(
  readingEntries: BookingPageLayoutEntry[] | null | undefined,
  sharedEntries: BookingPageLayoutEntry[] | null | undefined,
): BookingPageLayoutEntry[] {
  if (readingEntries?.length) return readingEntries;
  if (sharedEntries?.length) return sharedEntries;
  return defaultBookingPageLayoutEntries();
}

export function resolveBookingPageLayout(
  entries: BookingPageLayoutEntry[],
  visibility: BookingPageVisibility = {},
): BookingPageLayout {
  const hidden = new Set([...(visibility.hiddenEverywhere ?? []), ...(visibility.hiddenOnReading ?? [])]);
  const testimonialInsideForm = visibility.testimonialInsideForm !== false && !hidden.has("testimonial");
  const shown = ({ element }: KnownLayoutEntry) =>
    !hidden.has(element) && !(element === "testimonial" && testimonialInsideForm);
  const normalized = normalizeLayoutEntries(entries);
  const formIndex = normalized.findIndex(({ element }) => element === "form");
  const elementsOf = (slice: KnownLayoutEntry[]) => slice.filter(shown).map(({ element }) => element);
  return {
    aboveForm: elementsOf(normalized.slice(0, formIndex)),
    belowForm: elementsOf(normalized.slice(formIndex + 1)),
    testimonialInsideForm,
  };
}

export const DEFAULT_BOOKING_PAGE_LAYOUT = resolveBookingPageLayout(defaultBookingPageLayoutEntries());
