"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { FieldValues } from "@/components/IntakeForm/types";

import {
  type DraftValues,
  getLastReadingId,
  restore as restoreDraft,
  setLastReadingId,
} from "./localStorageDraft";

const SWAP_PRESERVED_KEYS = [
  "email",
  "first_name",
  "middle_name",
  "last_name",
  "legal_full_name",
  "anything_else",
] as const;

export function pickPreservedFields(values: DraftValues): Partial<FieldValues> {
  const result: Partial<FieldValues> = {};
  for (const key of SWAP_PRESERVED_KEYS) {
    if (key in values) result[key] = values[key];
  }
  return result;
}

export function clampRestoredPage(
  rawPage: number | undefined,
  totalPages: number,
): number {
  if (typeof rawPage !== "number" || Number.isNaN(rawPage)) return 0;
  const upper = Math.max(totalPages - 1, 0);
  return Math.min(Math.max(rawPage, 0), upper);
}

// https://react.dev/reference/react/useSyncExternalStore#im-getting-an-error-the-result-of-getsnapshot-should-be-cached
const swapNameCache = new Map<string, string | null>();

export function __resetSwapNameCacheForTest(): void {
  swapNameCache.clear();
}

function readSwapName(readingId: string, readingName: string): string | null {
  if (typeof window === "undefined") return null;
  if (swapNameCache.has(readingId)) return swapNameCache.get(readingId) ?? null;
  const previousReadingId = getLastReadingId();
  let result: string | null = null;
  if (previousReadingId && previousReadingId !== readingId) {
    const previousDraft = restoreDraft(previousReadingId);
    if (previousDraft) result = readingName;
  }
  swapNameCache.set(readingId, result);
  return result;
}

const noopSubscribe = () => () => {};

export type UseDraftRestoreArgs = {
  readingId: string;
  readingName: string;
  draftScope: string;
  defaultValues: FieldValues;
  totalPages: number;
};

export type UseDraftRestoreResult = {
  values: FieldValues;
  setValues: Dispatch<SetStateAction<FieldValues>>;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  lastSavedAt: Date | null;
  setLastSavedAt: Dispatch<SetStateAction<Date | null>>;
  isRestored: boolean;
  swappedFromReadingName: string | null;
  dismissSwapToast: () => void;
};

export function useDraftRestore({
  readingId,
  readingName,
  draftScope,
  defaultValues,
  totalPages,
}: UseDraftRestoreArgs): UseDraftRestoreResult {
  const [values, setValues] = useState<FieldValues>(defaultValues);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [swapDismissed, setSwapDismissed] = useState(false);
  const restoredForReadingRef = useRef<string | null>(null);

  const getSwapSnapshot = useCallback(
    () => readSwapName(readingId, readingName),
    [readingId, readingName],
  );
  const detectedSwapName = useSyncExternalStore(
    noopSubscribe,
    getSwapSnapshot,
    () => null,
  );

  useEffect(() => {
    if (restoredForReadingRef.current === readingId) return;
    const previousReadingId = getLastReadingId();
    let preservedFromSwap: Partial<FieldValues> | null = null;
    if (previousReadingId && previousReadingId !== readingId) {
      const previousDraft = restoreDraft(previousReadingId);
      if (previousDraft) {
        preservedFromSwap = pickPreservedFields(previousDraft.values);
      }
    }
    const restored = restoreDraft(draftScope);
    const seeded = {
      ...defaultValues,
      ...(restored?.values ?? {}),
      ...(preservedFromSwap ?? {}),
    } as FieldValues;
    const clampedPage = clampRestoredPage(restored?.currentPage, totalPages);
    const restoredSavedAt: Date | null = (() => {
      if (!restored?.savedAt) return null;
      const parsed = new Date(restored.savedAt);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })();
    setLastReadingId(readingId);
    restoredForReadingRef.current = readingId;
    queueMicrotask(() => {
      setValues(seeded);
      setCurrentPage(clampedPage);
      if (restoredSavedAt) setLastSavedAt(restoredSavedAt);
      setIsRestored(true);
    });
  }, [readingId, draftScope, readingName, defaultValues, totalPages]);

  return {
    values,
    setValues,
    currentPage,
    setCurrentPage,
    lastSavedAt,
    setLastSavedAt,
    isRestored,
    swappedFromReadingName: swapDismissed ? null : detectedSwapName,
    dismissSwapToast: () => setSwapDismissed(true),
  };
}
