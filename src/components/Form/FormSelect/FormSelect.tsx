"use client";

import { FieldShell } from "@/components/Form/FieldShell";
import { Select } from "@/components/Form/Select";
import type { SanityFormFieldOption, SanityFormHelperPosition } from "@/lib/sanity/types";

type FormSelectProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SanityFormFieldOption[];
  placeholder?: string;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

export function FormSelect({
  id,
  name,
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  helpText,
  helperPosition,
  clarificationNote,
  error,
  required,
  disabled,
}: FormSelectProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      helpText={helpText}
      helperPosition={helperPosition}
      clarificationNote={clarificationNote}
      error={error}
    >
      <input type="hidden" name={name} value={value} />
      <Select
        ariaLabel={label}
        placeholder={placeholder}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        options={options}
        className="w-full"
      />
    </FieldShell>
  );
}
