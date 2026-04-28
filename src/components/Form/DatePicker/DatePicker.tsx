import { FieldShell } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";

type DatePickerProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
};

export function DatePicker({
  id,
  name,
  label,
  value,
  onChange,
  helpText,
  error,
  required,
  disabled,
  min,
  max,
}: DatePickerProps) {
  return (
    <FieldShell id={id} label={label} required={required} helpText={helpText} error={error}>
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        className={inputClasses}
      />
    </FieldShell>
  );
}
