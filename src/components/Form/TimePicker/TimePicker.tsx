import { FieldShell } from "@/components/Form/FieldShell";
import { TIME_UNKNOWN_SENTINEL } from "@/lib/booking/submissionSchema";
import { inputClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

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
  const isUnknown = value === TIME_UNKNOWN_SENTINEL || unknownToggle?.checked === true;
  const displayValue = isUnknown ? "" : value;
  const inputDisabled = disabled || isUnknown;

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
      <input
        id={id}
        name={name}
        type="time"
        value={displayValue}
        onChange={(event) => onChange(event.target.value)}
        disabled={inputDisabled}
        required={required && !isUnknown}
        aria-invalid={error ? true : undefined}
        className={`${inputClasses} ${isUnknown ? "opacity-60" : ""}`}
      />
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
