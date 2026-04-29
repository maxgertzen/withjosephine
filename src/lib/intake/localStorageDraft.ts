export const DRAFT_KEY_PREFIX = "josephine.intake.draft.";
export const LAST_READING_ID_KEY = "josephine.intake.lastReadingId";
export const DRAFT_VERSION = 1;
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type DraftValues = Record<string, string | string[] | boolean>;

export type DraftEnvelope = {
  version: number;
  savedAt: string;
  currentPage: number;
  values: DraftValues;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function draftKey(readingId: string): string {
  return `${DRAFT_KEY_PREFIX}${readingId}`;
}

export function save(
  readingId: string,
  payload: { currentPage: number; values: DraftValues },
): DraftEnvelope | null {
  if (!isBrowser()) return null;
  const envelope: DraftEnvelope = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    currentPage: payload.currentPage,
    values: payload.values,
  };
  try {
    window.localStorage.setItem(draftKey(readingId), JSON.stringify(envelope));
    return envelope;
  } catch {
    return null;
  }
}

export function restore(readingId: string): DraftEnvelope | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(draftKey(readingId));
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clear(readingId);
    return null;
  }

  if (!isEnvelope(parsed)) {
    clear(readingId);
    return null;
  }
  if (parsed.version !== DRAFT_VERSION) {
    clear(readingId);
    return null;
  }

  const savedAtMs = Date.parse(parsed.savedAt);
  if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > DRAFT_TTL_MS) {
    clear(readingId);
    return null;
  }

  return parsed;
}

export function clear(readingId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(draftKey(readingId));
  } catch {
    // localStorage write failures are non-fatal here.
  }
}

export function clearAll(): void {
  if (!isBrowser()) return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(DRAFT_KEY_PREFIX)) keys.push(key);
  }
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  try {
    window.localStorage.removeItem(LAST_READING_ID_KEY);
  } catch {
    // ignore
  }
}

export function getLastReadingId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(LAST_READING_ID_KEY);
}

export function setLastReadingId(readingId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LAST_READING_ID_KEY, readingId);
  } catch {
    // ignore
  }
}

function isEnvelope(value: unknown): value is DraftEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === "number" &&
    typeof v.savedAt === "string" &&
    typeof v.currentPage === "number" &&
    typeof v.values === "object" &&
    v.values !== null
  );
}
