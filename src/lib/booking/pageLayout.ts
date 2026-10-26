export const BOOKING_PAGE_ELEMENTS = [
  { key: "summary", title: "Small label, promise and description" },
  { key: "facts", title: "Facts row" },
  { key: "reader", title: "Reader name and photo" },
  { key: "included", title: "What's included" },
  { key: "howItWorks", title: "How it works" },
  { key: "questions", title: "Questions" },
  { key: "notes", title: "Notes" },
  { key: "otherReadings", title: "Not sure this is the one?" },
  { key: "giftRow", title: "Gift row" },
  { key: "intro", title: "Form heading and opening words" },
  { key: "testimonial", title: "Testimonial" },
  { key: "form", title: "The form" },
] as const;

export type BookingPageElement = (typeof BOOKING_PAGE_ELEMENTS)[number]["key"];

export type BookingPageLayoutEntry = {
  element?: string | null;
  hidden?: boolean | null;
  insideForm?: boolean | null;
};

export type BookingPageLayout = {
  aboveForm: BookingPageElement[];
  belowForm: BookingPageElement[];
  testimonialInsideForm: boolean;
};

export const DEFAULT_ORDER: BookingPageElement[] = BOOKING_PAGE_ELEMENTS.map(({ key }) => key);

function isBookingPageElement(value: unknown): value is BookingPageElement {
  return DEFAULT_ORDER.includes(value as BookingPageElement);
}

type KnownLayoutEntry = BookingPageLayoutEntry & { element: BookingPageElement };

function defaultEntry(element: BookingPageElement): KnownLayoutEntry {
  return element === "testimonial"
    ? { element, hidden: false, insideForm: true }
    : { element, hidden: false };
}

export function defaultBookingPageLayoutEntries(): KnownLayoutEntry[] {
  return DEFAULT_ORDER.map(defaultEntry);
}

function knownEntriesOnce(entries: BookingPageLayoutEntry[]): KnownLayoutEntry[] {
  const seen = new Set<BookingPageElement>();
  const known: KnownLayoutEntry[] = [];
  for (const entry of entries) {
    if (!isBookingPageElement(entry.element) || seen.has(entry.element)) continue;
    seen.add(entry.element);
    known.push({ ...entry, element: entry.element });
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
    result.splice(insertAt, 0, defaultEntry(element));
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

export function resolveBookingPageLayout(entries: BookingPageLayoutEntry[]): BookingPageLayout {
  const normalized = normalizeLayoutEntries(entries);
  const testimonial = normalized.find((entry) => entry.element === "testimonial");
  const testimonialInsideForm = testimonial?.insideForm !== false;
  const shown = (entry: KnownLayoutEntry) => {
    if (entry.element === "form") return false;
    if (entry.element === "testimonial" && testimonialInsideForm) return false;
    return !entry.hidden;
  };
  const formIndex = normalized.findIndex((entry) => entry.element === "form");
  const elementsOf = (slice: KnownLayoutEntry[]) => slice.filter(shown).map((entry) => entry.element);
  return {
    aboveForm: elementsOf(normalized.slice(0, formIndex)),
    belowForm: elementsOf(normalized.slice(formIndex + 1)),
    testimonialInsideForm: testimonialInsideForm && !testimonial?.hidden,
  };
}

export const DEFAULT_BOOKING_PAGE_LAYOUT = resolveBookingPageLayout(defaultBookingPageLayoutEntries());
