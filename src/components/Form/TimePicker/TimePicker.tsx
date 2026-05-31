"use client";

import * as Popover from "@radix-ui/react-popover";
import { useId, useRef, useState } from "react";

import { FieldShell, FloatingLabel } from "@/components/Form/FieldShell";
import { Select, type SelectOption } from "@/components/Form/Select";
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

const HOUR_OPTIONS: ReadonlyArray<SelectOption> = HOURS.map((h) => ({ value: h, label: h }));
const MINUTE_OPTIONS: ReadonlyArray<SelectOption> = MINUTES.map((m) => ({ value: m, label: m }));

function autoformatTime(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const isUnknown = value === TIME_UNKNOWN_SENTINEL || unknownToggle?.checked === true;
  const visible = draft !== null ? draft : isUnknown ? "" : value;
  const inputDisabled = disabled || isUnknown;

  const [hh, mm] = (() => {
    const match = HHMM.test(value) ? value.split(":") : ["", ""];
    return [match[0] ?? "", match[1] ?? ""];
  })();

  function commit(nextHh: string, nextMm: string) {
    if (!nextHh || !nextMm) return;
    onChange(`${nextHh}:${nextMm}`);
    setDraft(null);
  }

  function handleManualInput(text: string) {
    const formatted = autoformatTime(text);
    setDraft(formatted);
    if (formatted === "") {
      onChange("");
      return;
    }
    if (HHMM.test(formatted)) {
      onChange(formatted);
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
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor className="relative block">
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            role="combobox"
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
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            className={`${inputClasses} ${isUnknown ? "opacity-60" : ""}`}
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
            aria-label="Choose a time"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (event.target === inputRef.current) event.preventDefault();
            }}
            className="z-50 bg-j-ivory border border-j-border-gold rounded-md shadow-j-card p-4 min-w-[200px]"
          >
            <p className="font-display italic text-sm text-j-text-muted text-center mb-3">
              Hour and minute
            </p>
            <div className="flex items-center justify-center gap-2">
              <Select
                ariaLabel="Hour"
                placeholder="HH"
                value={hh}
                onValueChange={(next) => commit(next, mm || "00")}
                options={HOUR_OPTIONS}
                portalContainer={contentNode}
              />
              <span aria-hidden="true" className="font-display italic text-j-text-heading">
                :
              </span>
              <Select
                ariaLabel="Minute"
                placeholder="MM"
                value={mm}
                onValueChange={(next) => commit(hh || "00", next)}
                options={MINUTE_OPTIONS}
                portalContainer={contentNode}
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 block mx-auto font-display italic text-sm text-j-text-muted hover:text-j-text-heading transition-colors"
            >
              Done
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {unknownToggle ? (
        <>
          <label className="mt-3 inline-flex items-center gap-2 font-body text-sm text-j-text">
            <input
              type="checkbox"
              checked={unknownToggle.checked}
              onChange={(event) => unknownToggle.onChange(event.target.checked)}
              disabled={disabled}
              className="h-4 w-4 accent-j-accent"
            />
            <span>{unknownToggle.label}</span>
          </label>
          <span role="status" aria-live="polite" className="sr-only">
            {unknownToggle.checked ? "Birth time set to unknown." : ""}
          </span>
        </>
      ) : null}
    </FieldShell>
  );
}
