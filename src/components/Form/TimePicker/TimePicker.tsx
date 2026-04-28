import { FieldShell } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";

type TimePickerProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

export function TimePicker({
  id,
  name,
  label,
  value,
  onChange,
  helpText,
  error,
  required,
  disabled,
}: TimePickerProps) {
  return (
    <FieldShell id={id} label={label} required={required} helpText={helpText} error={error}>
      <input
        id={id}
        name={name}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        className={inputClasses}
      />
    </FieldShell>
  );
}
