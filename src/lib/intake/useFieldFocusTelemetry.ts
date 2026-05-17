"use client";

import { type RefObject, useEffect, useRef } from "react";

import { track } from "@/lib/analytics";

import { FIELD_ID_PREFIX } from "./intakeValidation";

export type UseFieldFocusTelemetryArgs = {
  formRef: RefObject<HTMLFormElement | null>;
  readingId: string;
  currentPage: number;
};

export function useFieldFocusTelemetry({
  formRef,
  readingId,
  currentPage,
}: UseFieldFocusTelemetryArgs): void {
  const focusedFieldsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    function onFocusIn(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      const id = target?.id ?? "";
      if (!id.startsWith(FIELD_ID_PREFIX)) return;
      const fieldKey = id.slice(FIELD_ID_PREFIX.length);
      if (focusedFieldsRef.current.has(fieldKey)) return;
      focusedFieldsRef.current.add(fieldKey);
      track("intake_field_first_focus", {
        reading_id: readingId,
        field_key: fieldKey,
        page_number: currentPage + 1,
      });
    }
    form.addEventListener("focusin", onFocusIn);
    return () => form.removeEventListener("focusin", onFocusIn);
  }, [formRef, readingId, currentPage]);
}
