"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";

import type { FieldValues } from "@/components/IntakeForm/types";

import {
  type DraftEnvelope,
  type DraftValues,
  getLastReadingId,
  restore as restoreDraft,
  setLastReadingId,
} from "./localStorageDraft";

const NAME_AND_EMAIL_KEYS = [
  "email",
  "first_name",
  "middle_name",
  "last_name",
  "legal_full_name",
] as const;

const CARRIED_OVER_KEYS = [...NAME_AND_EMAIL_KEYS, "anything_else"] as const;

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
  return NAME_AND_EMAIL_KEYS.some((key) => key in fields);
}

function fieldsCarriedOverFrom(readingId: string): Partial<FieldValues> {
  const previousReadingId = getLastReadingId();
  if (!previousReadingId || previousReadingId === readingId) return {};
  const previousDraft = restoreDraft(previousReadingId);
  return previousDraft ? pickCarriedOverFields(previousDraft.values) : {};
}

function isGiftDraftLeftOnPage(
  draft: DraftEnvelope | null,
  giftCode: string | undefined,
  page: number,
): boolean {
  return giftCode !== undefined && draft?.giftCode === giftCode && draft.currentPage === page;
}

export type InitialPage = "first" | "last";

export type UseDraftRestoreArgs = {
  readingId: string;
  defaultValues: FieldValues;
  totalPages: number;
  initialPage?: InitialPage;
  giftCode?: string;
};

export type UseDraftRestoreResult = {
  values: FieldValues;
  setValues: Dispatch<SetStateAction<FieldValues>>;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  lastSavedAt: Date | null;
  setLastSavedAt: Dispatch<SetStateAction<Date | null>>;
  isRestored: boolean;
  restoredFromDraft: boolean;
  nameOrEmailCarriedOver: boolean;
};

export function useDraftRestore({
  readingId,
  defaultValues,
  totalPages,
  initialPage = "first",
  giftCode,
}: UseDraftRestoreArgs): UseDraftRestoreResult {
  const [values, setValues] = useState<FieldValues>(defaultValues);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
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
    const lastPage = Math.max(totalPages - 1, 0);
    const opensOnLastPage =
      initialPage === "last" || isGiftDraftLeftOnPage(restored, giftCode, lastPage);
    setLastReadingId(readingId);
    restoredForReadingRef.current = readingId;
    queueMicrotask(() => {
      setValues(seeded);
      setNameOrEmailCarriedOver(hasNameOrEmail(carriedOverFields));
      setCurrentPage(opensOnLastPage ? lastPage : 0);
      if (restoredSavedAt) setLastSavedAt(restoredSavedAt);
      setRestoredFromDraft(restored !== null);
      setIsRestored(true);
    });
  }, [readingId, defaultValues, totalPages, initialPage, giftCode]);

  return {
    values,
    setValues,
    currentPage,
    setCurrentPage,
    lastSavedAt,
    setLastSavedAt,
    isRestored,
    restoredFromDraft,
    nameOrEmailCarriedOver,
  };
}
