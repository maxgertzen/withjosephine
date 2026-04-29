"use client";

import { useEffect, useId, useRef, useState } from "react";

import { FieldShell, FloatingLabel } from "@/components/Form/FieldShell";
import { TIME_UNKNOWN_SENTINEL } from "@/lib/booking/submissionSchema";
import { inputClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

const HHMM = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

type TimePickerProps = {
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
  unknownToggle?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

function formatDisplay(value: string): string {
  if (!value || value === TIME_UNKNOWN_SENTINEL) return "";
  if (HHMM.test(value)) return value;
  return value;
}

export function TimePicker({
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
  unknownToggle,
}: TimePickerProps) {
  const popoverId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const isUnknown = value === TIME_UNKNOWN_SENTINEL || unknownToggle?.checked === true;
  const visible = draft !== null ? draft : isUnknown ? "" : formatDisplay(value);
  const inputDisabled = disabled || isUnknown;

  const [hh, mm] = (() => {
    const match = HHMM.test(value) ? value.split(":") : ["", ""];
    return [match[0] ?? "", match[1] ?? ""];
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

  function commit(nextHh: string, nextMm: string) {
    if (!nextHh || !nextMm) return;
    onChange(`${nextHh}:${nextMm}`);
    setDraft(null);
  }

  function handleManualInput(text: string) {
    setDraft(text);
    if (text === "") {
      onChange("");
      return;
    }
    if (HHMM.test(text)) {
      onChange(text);
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
          value={visible}
          onChange={(event) => handleManualInput(event.target.value)}
          onFocus={() => !inputDisabled && setOpen(true)}
          onBlur={() => setDraft(null)}
          placeholder=" "
          disabled={inputDisabled}
          required={required && !isUnknown}
          autoComplete="off"
          inputMode="numeric"
          aria-haspopup="dialog"
          aria-controls={popoverId}
          aria-invalid={error ? true : undefined}
          className={`${inputClasses} ${isUnknown ? "opacity-60" : ""}`}
        />
        <FloatingLabel id={id} label={label} required={required} />
        {open ? (
          <div
            id={popoverId}
            role="dialog"
            aria-label="Choose a time"
            className="absolute left-0 top-full mt-2 z-20 bg-j-ivory border border-j-border-gold rounded-md shadow-j-card p-4 min-w-[200px]"
          >
            <p className="font-display italic text-sm text-j-text-muted text-center mb-3">
              Hour and minute
            </p>
            <div className="flex items-center justify-center gap-2">
              <select
                aria-label="Hour"
                value={hh}
                onChange={(event) => commit(event.target.value, mm || "00")}
                className="font-body text-base bg-j-cream border border-j-border-subtle rounded-sm px-3 py-2 text-j-text-heading focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep"
              >
                <option value="" disabled>
                  HH
                </option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="font-display italic text-j-text-heading">
                :
              </span>
              <select
                aria-label="Minute"
                value={mm}
                onChange={(event) => commit(hh || "00", event.target.value)}
                className="font-body text-base bg-j-cream border border-j-border-subtle rounded-sm px-3 py-2 text-j-text-heading focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep"
              >
                <option value="" disabled>
                  MM
                </option>
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 block mx-auto font-display italic text-sm text-j-text-muted hover:text-j-text-heading transition-colors"
            >
              Done
            </button>
          </div>
        ) : null}
      </div>
      {unknownToggle ? (
        <label className="mt-3 inline-flex items-center gap-2 font-body text-sm text-j-text cursor-pointer">
          <input
            type="checkbox"
            checked={unknownToggle.checked}
            onChange={(event) => unknownToggle.onChange(event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 accent-j-accent"
          />
          <span>{unknownToggle.label}</span>
        </label>
      ) : null}
    </FieldShell>
  );
}
