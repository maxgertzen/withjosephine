import { FieldShell } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

type TextareaProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
};

export function Textarea({
  id,
  name,
  label,
  value,
  onChange,
  rows = 5,
  placeholder,
  helpText,
  helperPosition,
  clarificationNote,
  error,
  required,
  disabled,
  maxLength,
}: TextareaProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      helpText={helpText}
      helperPosition={helperPosition}
      clarificationNote={clarificationNote}
      error={error}
      multilineLabel
    >
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? " "}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={`${inputClasses} min-h-32`}
      />
    </FieldShell>
  );
}
