"use client";

import * as Popover from "@radix-ui/react-popover";
import { differenceInYears, format, isValid, parse } from "date-fns";
import { useId, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";

import { createSelectDropdown } from "@/components/Form/DayPickerShared/createSelectDropdown";
import {
  DAY_PICKER_BASE_CLASSES,
  DAY_PICKER_LABELS,
} from "@/components/Form/DayPickerShared/dayPickerShared";
import { fieldDescribedBy, FieldShell, FloatingLabel } from "@/components/Form/FieldShell";
import { DATE_HELP_TEXT_FALLBACK, DATE_PLACEHOLDER_FALLBACK } from "@/data/defaults";
import { inputClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";
import { LAYER } from "@/styles/layers";

const ISO_DATE = "yyyy-MM-dd";
const SLASH_DATE = "dd/MM/yyyy";
const BROWSER_FILL_FORMATS = [
  ISO_DATE,
  "yyyy/M/d",
  "d.M.yyyy",
  "d/M/yyyy",
  "M/d/yyyy",
  "d-M-yyyy",
  "d M yyyy",
  "MMMM d, yyyy",
  "MMM d, yyyy",
  "d MMMM yyyy",
  "d MMM yyyy",
];
const HAS_FULL_YEAR = /^\d{4}\D|\D\d{4}$/;

type DatePickerProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  minAge?: number;
};

function parseIso(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, ISO_DATE, new Date());
  return isValid(parsed) ? parsed : undefined;
}

function dateFromBrowserFill(text: string): Date | null {
  const trimmed = text.trim();
  if (!HAS_FULL_YEAR.test(trimmed)) return null;
  for (const pattern of BROWSER_FILL_FORMATS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
}

function autoformatSlash(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function DatePicker({
  id,
  name,
  label,
  value,
  onChange,
  helpText,
  helperPosition,
  clarificationNote,
  placeholder,
  error,
  required,
  disabled,
  min,
  max,
  minAge,
}: DatePickerProps) {
  const popoverId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<string | null>(null);
  const [leftWithInvalidDate, setLeftWithInvalidDate] = useState(false);
  const shownError = leftWithInvalidDate ? DATE_HELP_TEXT_FALLBACK : error;
  const shownHelp = leftWithInvalidDate ? undefined : helpText || DATE_HELP_TEXT_FALLBACK;

  const dayPickerComponents = useMemo(
    () => ({ Dropdown: createSelectDropdown(contentNode) }),
    [contentNode],
  );

  const draft =
    manualDraft !== null
      ? manualDraft
      : (() => {
          const parsed = parseIso(value);
          return parsed ? format(parsed, SLASH_DATE) : value;
        })();

  const selected = parseIso(value);
  const minDate = min ? parseIso(min) : undefined;
  const maxDate = max ? parseIso(max) : undefined;
  const [month, setMonth] = useState<Date | undefined>(selected ?? maxDate ?? new Date());
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setMonth(selected ?? maxDate ?? new Date());
    if (value) {
      setManualDraft(null);
      setLeftWithInvalidDate(false);
    }
  }
  const ageWarning =
    typeof minAge === "number" && selected && selected <= new Date()
      ? differenceInYears(new Date(), selected) < minAge
      : false;

  function handleSelect(date: Date | undefined) {
    onChange(date ? format(date, ISO_DATE) : "");
    setManualDraft(null);
    setLeftWithInvalidDate(false);
    setOpen(false);
  }

  function handleManualInput(text: string) {
    setLeftWithInvalidDate(false);
    const filledDate = dateFromBrowserFill(text);
    if (filledDate) {
      setManualDraft(format(filledDate, SLASH_DATE));
      onChange(format(filledDate, ISO_DATE));
      return;
    }
    const formatted = autoformatSlash(text);
    setManualDraft(formatted);
    if (formatted === "") {
      onChange("");
      return;
    }
    if (formatted.length === 10) {
      const slashed = parse(formatted, SLASH_DATE, new Date());
      if (isValid(slashed)) {
        onChange(format(slashed, ISO_DATE));
        return;
      }
    }
    if (value) onChange("");
  }

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      helpText={shownHelp}
      helperPosition={helperPosition}
      clarificationNote={clarificationNote}
      error={shownError}
      afterField={
        ageWarning ? (
          <p
            data-testid="dob-age-warning"
            role="note"
            className="mt-2 font-display italic text-sm text-j-text-muted"
          >
            <span aria-hidden="true" className="text-j-ornament mr-2">
              ✦
            </span>
            That puts you under {minAge}. Please double-check the date - if it&rsquo;s correct, no
            need to change a thing.
          </p>
        ) : null
      }
      noLabel
    >
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor className="relative block">
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            role="combobox"
            value={draft}
            onChange={(event) => handleManualInput(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || DATE_PLACEHOLDER_FALLBACK}
            disabled={disabled}
            required={required}
            autoComplete="bday"
            inputMode="numeric"
            aria-haspopup="dialog"
            aria-controls={popoverId}
            aria-expanded={open}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={fieldDescribedBy(id, { helpText: shownHelp, error: shownError })}
            className={inputClasses}
            onBlur={(event) => {
              if (contentNode?.contains(event.relatedTarget)) return;
              if (manualDraft && !value) setLeftWithInvalidDate(true);
              else setManualDraft(null);
            }}
          />
          <FloatingLabel id={id} label={label} required={required} />
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            ref={setContentNode}
            id={popoverId}
            side="bottom"
            align="start"
            sideOffset={8}
            aria-label="Choose a date"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (event.target === inputRef.current) event.preventDefault();
            }}
            className={`${LAYER.popover} bg-j-ivory border border-j-border-gold rounded-md shadow-j-card p-4 min-w-[280px]`}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              startMonth={minDate}
              endMonth={maxDate}
              month={month ?? new Date()}
              onMonthChange={setMonth}
              captionLayout="dropdown"
              showOutsideDays
              labels={DAY_PICKER_LABELS}
              classNames={DAY_PICKER_BASE_CLASSES}
              components={dayPickerComponents}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldShell>
  );
}
