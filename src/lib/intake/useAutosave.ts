"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { FieldValues } from "@/components/IntakeForm/types";
import { track, trackThrottled } from "@/lib/analytics";

import {
  clear as clearDraft,
  type DraftValues,
  save as saveDraft,
} from "./localStorageDraft";

const SAVE_AUTO_TRACK_INTERVAL_MS = 30_000;
const AUTOSAVE_DEBOUNCE_MS = 500;
const CHIP_TICK_INTERVAL_MS = 30_000;

export type UseAutosaveArgs = {
  values: FieldValues;
  currentPage: number;
  defaultValues: FieldValues;
  defaultValuesSnapshot: string;
  isRestored: boolean;
  draftScope: string;
  readingId: string;
  setValues: Dispatch<SetStateAction<FieldValues>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setLastSavedAt: Dispatch<SetStateAction<Date | null>>;
  lastSavedAt: Date | null;
  onAfterDiscard?: () => void;
};

export type UseAutosaveResult = {
  chipTick: number;
  valuesUntouched: boolean;
  flushSave: (nextValues: FieldValues, nextPage: number) => void;
  handleSaveLater: () => void;
  handleDiscardDraft: () => void;
};

export function useAutosave({
  values,
  currentPage,
  defaultValues,
  defaultValuesSnapshot,
  isRestored,
  draftScope,
  readingId,
  setValues,
  setCurrentPage,
  setLastSavedAt,
  lastSavedAt,
  onAfterDiscard,
}: UseAutosaveArgs): UseAutosaveResult {
  const [chipTick, setChipTick] = useState(0);
  const justDiscardedRef = useRef(false);

  const valuesUntouched = useMemo(
    () => JSON.stringify(values) === defaultValuesSnapshot,
    [values, defaultValuesSnapshot],
  );

  const flushSave = useCallback(
    (nextValues: FieldValues, nextPage: number) => {
      const envelope = saveDraft(draftScope, {
        currentPage: nextPage,
        values: nextValues as DraftValues,
      });
      if (envelope) setLastSavedAt(new Date(envelope.savedAt));
    },
    [draftScope, setLastSavedAt],
  );

  useEffect(() => {
    if (!isRestored) return;
    if (justDiscardedRef.current) {
      justDiscardedRef.current = false;
      return;
    }
    if (valuesUntouched) return;
    const handle = setTimeout(() => {
      flushSave(values, currentPage);
      trackThrottled(
        "intake_save_auto",
        { reading_id: readingId, page_number: currentPage + 1 },
        SAVE_AUTO_TRACK_INTERVAL_MS,
      );
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [
    isRestored,
    values,
    currentPage,
    readingId,
    valuesUntouched,
    flushSave,
  ]);

  useEffect(() => {
    if (!lastSavedAt) return;
    const interval = setInterval(
      () => setChipTick((t) => t + 1),
      CHIP_TICK_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const handleSaveLater = useCallback(() => {
    if (valuesUntouched) return;
    flushSave(values, currentPage);
    setChipTick((t) => t + 1);
    track("intake_save_click", {
      reading_id: readingId,
      page_number: currentPage + 1,
    });
  }, [valuesUntouched, flushSave, values, currentPage, readingId]);

  const handleDiscardDraft = useCallback(() => {
    track("intake_clear_draft_click", {
      reading_id: readingId,
      page_number: currentPage + 1,
    });
    justDiscardedRef.current = true;
    clearDraft(draftScope);
    setValues(defaultValues);
    setCurrentPage(0);
    setLastSavedAt(null);
    onAfterDiscard?.();
  }, [
    readingId,
    currentPage,
    draftScope,
    setValues,
    defaultValues,
    setCurrentPage,
    setLastSavedAt,
    onAfterDiscard,
  ]);

  return {
    chipTick,
    valuesUntouched,
    flushSave,
    handleSaveLater,
    handleDiscardDraft,
  };
}
