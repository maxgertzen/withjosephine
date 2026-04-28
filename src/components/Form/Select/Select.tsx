import { FieldShell } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";
import type { SanityFormFieldOption } from "@/lib/sanity/types";

type SelectProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SanityFormFieldOption[];
  placeholder?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

export function Select({
  id,
  name,
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  helpText,
  error,
  required,
  disabled,
}: SelectProps) {
  return (
    <FieldShell id={id} label={label} required={required} helpText={helpText} error={error}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        className={inputClasses}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
