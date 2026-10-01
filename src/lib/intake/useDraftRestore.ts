"use client";

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

import type { FieldValues } from "@/components/IntakeForm/types";

import {
  type DraftValues,
  getLastReadingId,
  restore as restoreDraft,
  setLastReadingId,
} from "./localStorageDraft";

const CARRIED_OVER_KEYS = [
  "email",
  "first_name",
  "middle_name",
  "last_name",
  "legal_full_name",
  "anything_else",
] as const;

const NOTICE_NAMED_KEYS = CARRIED_OVER_KEYS.filter((key) => key !== "anything_else");

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export function pickCarriedOverFields(values: DraftValues): Partial<FieldValues> {
  const result: Partial<FieldValues> = {};
  for (const key of CARRIED_OVER_KEYS) {
    if (isFilled(values[key])) result[key] = values[key];
  }
  return result;
}

function hasNameOrEmail(fields: Partial<FieldValues>): boolean {
  return NOTICE_NAMED_KEYS.some((key) => key in fields);
}

function fieldsCarriedOverFrom(readingId: string): Partial<FieldValues> {
  const previousReadingId = getLastReadingId();
  if (!previousReadingId || previousReadingId === readingId) return {};
  const previousDraft = restoreDraft(previousReadingId);
  return previousDraft ? pickCarriedOverFields(previousDraft.values) : {};
}

export type UseDraftRestoreArgs = {
  readingId: string;
  defaultValues: FieldValues;
};

export type UseDraftRestoreResult = {
  values: FieldValues;
  setValues: Dispatch<SetStateAction<FieldValues>>;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  lastSavedAt: Date | null;
  setLastSavedAt: Dispatch<SetStateAction<Date | null>>;
  isRestored: boolean;
  nameOrEmailCarriedOver: boolean;
};

export function useDraftRestore({
  readingId,
  defaultValues,
}: UseDraftRestoreArgs): UseDraftRestoreResult {
  const [values, setValues] = useState<FieldValues>(defaultValues);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [nameOrEmailCarriedOver, setNameOrEmailCarriedOver] = useState(false);
  const restoredForReadingRef = useRef<string | null>(null);

  useEffect(() => {
    if (restoredForReadingRef.current === readingId) return;
    const carriedOverFields = fieldsCarriedOverFrom(readingId);
    const restored = restoreDraft(readingId);
    const seeded = {
      ...defaultValues,
      ...restored?.values,
      ...carriedOverFields,
    } as FieldValues;
    const restoredSavedAt: Date | null = (() => {
      if (!restored?.savedAt) return null;
      const parsed = new Date(restored.savedAt);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })();
    setLastReadingId(readingId);
    restoredForReadingRef.current = readingId;
    queueMicrotask(() => {
      setValues(seeded);
      setNameOrEmailCarriedOver(hasNameOrEmail(carriedOverFields));
      // Always resume on the first page even when values are prefilled; the
      // saved page index is intentionally not restored.
      setCurrentPage(0);
      if (restoredSavedAt) setLastSavedAt(restoredSavedAt);
      setIsRestored(true);
    });
  }, [readingId, defaultValues]);

  return {
    values,
    setValues,
    currentPage,
    setCurrentPage,
    lastSavedAt,
    setLastSavedAt,
    isRestored,
    nameOrEmailCarriedOver,
  };
}
