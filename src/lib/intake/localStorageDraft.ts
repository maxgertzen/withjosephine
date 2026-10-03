import { withLocalStorage } from "@/lib/browserStorage";

export const DRAFT_KEY_PREFIX = "josephine.intake.draft.";
export const LAST_READING_ID_KEY = "josephine.intake.lastReadingId";
export const DRAFT_VERSION = 1;
// Idle cutoff: drafts whose `savedAt` is older than this on next restore are
// silently cleared. `savedAt` updates on every save (autosaves fire on every
// edit, debounced 500ms), so this is effectively a "no edits in 72h" timer.
export const DRAFT_TTL_MS = 72 * 60 * 60 * 1000;

export type DraftValues = Record<string, string | string[] | boolean>;

export type DraftEnvelope = {
  version: number;
  savedAt: string;
  currentPage: number;
  values: DraftValues;
};

function draftKey(readingId: string): string {
  return `${DRAFT_KEY_PREFIX}${readingId}`;
}

export function save(
  readingId: string,
  payload: { currentPage: number; values: DraftValues },
): DraftEnvelope | null {
  const envelope: DraftEnvelope = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    currentPage: payload.currentPage,
    values: payload.values,
  };
  return withLocalStorage((storage) => {
    storage.setItem(draftKey(readingId), JSON.stringify(envelope));
    return envelope;
  }, null);
}

export function restore(readingId: string): DraftEnvelope | null {
  const raw = withLocalStorage((storage) => storage.getItem(draftKey(readingId)), null);
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

function removeKey(key: string): void {
  withLocalStorage((storage) => storage.removeItem(key), undefined);
}

export function clear(readingId: string): void {
  removeKey(draftKey(readingId));
}

export function clearAll(): void {
  const draftKeys = withLocalStorage((storage) => {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(DRAFT_KEY_PREFIX)) keys.push(key);
    }
    return keys;
  }, []);
  draftKeys.forEach(removeKey);
  removeKey(LAST_READING_ID_KEY);
}

export function getLastReadingId(): string | null {
  return withLocalStorage((storage) => storage.getItem(LAST_READING_ID_KEY), null);
}

export function setLastReadingId(readingId: string): void {
  withLocalStorage((storage) => storage.setItem(LAST_READING_ID_KEY, readingId), undefined);
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
