"use client";

import { differenceInYears, format, isValid, parse } from "date-fns";
import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";

import { FieldShell, FloatingLabel } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

const ISO_DATE = "yyyy-MM-dd";
const SLASH_DATE = "dd/MM/yyyy";

type DatePickerProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
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
  error,
  required,
  disabled,
  min,
  max,
  minAge,
}: DatePickerProps) {
  const popoverId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<string | null>(null);

  const draft =
    manualDraft !== null
      ? manualDraft
      : (() => {
          const parsed = parseIso(value);
          return parsed ? format(parsed, SLASH_DATE) : value;
        })();

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = parseIso(value);
  const minDate = min ? parseIso(min) : undefined;
  const maxDate = max ? parseIso(max) : undefined;
  const [month, setMonth] = useState<Date | undefined>(selected ?? maxDate);

  useEffect(() => {
    // setState-in-effect is intentional here — keep calendar month synced to the
    // typed value when navigating across months. Refactor to derived state queued
    // in POST_LAUNCH_BACKLOG (react-hooks/refs sweep).
     
    if (selected) setMonth(selected);
    // selected is recomputed each render; key off the stable string value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const ageWarning =
    typeof minAge === "number" && selected
      ? differenceInYears(new Date(), selected) < minAge
      : false;

  function handleSelect(date: Date | undefined) {
    if (!date) {
      onChange("");
      setManualDraft(null);
      setOpen(false);
      return;
    }
    onChange(format(date, ISO_DATE));
    setManualDraft(null);
    setOpen(false);
  }

  function handleManualInput(text: string) {
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
      }
    }
  }

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      helpText={helpText}
      helperPosition={helperPosition}
      clarificationNote={clarificationNote}
      error={error}
      noLabel
    >
      <div ref={wrapperRef} className="relative">
        <input
          id={id}
          name={name}
          type="text"
          value={draft}
          onChange={(event) => handleManualInput(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder=" "
          disabled={disabled}
          required={required}
          autoComplete="bday"
          inputMode="numeric"
          aria-haspopup="dialog"
          aria-controls={popoverId}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
          onBlur={() => setManualDraft(null)}
        />
        <FloatingLabel id={id} label={label} required={required} />
        {ageWarning ? (
          <p
            data-testid="dob-age-warning"
            role="note"
            className="mt-2 font-display italic text-sm text-j-text-muted"
          >
            <span aria-hidden="true" className="text-j-accent mr-2">
              ✦
            </span>
            That puts you under {minAge}. Please double-check the date — if it&rsquo;s
            correct, no need to change a thing.
          </p>
        ) : null}
        {open ? (
          <div
            id={popoverId}
            role="dialog"
            aria-label="Choose a date"
            className="absolute left-0 top-full mt-2 z-20 bg-j-ivory border border-j-border-gold rounded-md shadow-j-card p-4 min-w-[280px]"
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
              classNames={{
                root: "font-body text-sm text-j-text [--rdp-accent-color:var(--j-accent)] [--rdp-accent-background-color:var(--j-blush)]",
                months: "flex flex-col gap-3",
                month: "flex flex-col gap-3",
                month_caption:
                  "flex items-center justify-center gap-2 font-display italic text-base text-j-text-heading",
                caption_label: "sr-only",
                dropdowns: "flex gap-2 items-center",
                dropdown:
                  "font-body text-sm bg-j-cream border border-j-border-subtle rounded-sm px-2 py-1 text-j-text-heading focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep",
                nav: "flex items-center justify-between absolute inset-x-0 top-0 px-1 pointer-events-none",
                button_previous:
                  "pointer-events-auto inline-flex items-center justify-center w-8 h-8 rounded-sm text-j-text-heading hover:bg-j-blush/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep",
                button_next:
                  "pointer-events-auto inline-flex items-center justify-center w-8 h-8 rounded-sm text-j-text-heading hover:bg-j-blush/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday:
                  "flex-1 font-body text-[0.7rem] tracking-wider uppercase text-j-text-muted py-2 text-center",
                week: "flex w-full",
                day: "flex-1 text-center p-0",
                day_button:
                  "w-9 h-9 inline-flex items-center justify-center font-body text-sm rounded-sm transition-colors hover:bg-j-blush/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep",
                outside: "[&>button]:text-j-text-muted/50",
                selected: "[&>button]:bg-j-deep [&>button]:text-j-cream [&>button]:hover:bg-j-deep",
                today: "[&>button]:font-semibold [&>button]:text-j-accent",
                disabled: "[&>button]:opacity-40 [&>button]:cursor-not-allowed",
                chevron: "fill-j-text-heading w-4 h-4",
              }}
            />
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}
