import { FieldShell } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";

type TextareaProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  helpText?: string;
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
  error,
  required,
  disabled,
  maxLength,
}: TextareaProps) {
  return (
    <FieldShell id={id} label={label} required={required} helpText={helpText} error={error}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={inputClasses}
      />
    </FieldShell>
  );
}
