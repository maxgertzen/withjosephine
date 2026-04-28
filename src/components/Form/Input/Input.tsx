import { FieldShell } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";

type InputProps = {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
};

export function Input({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  helpText,
  error,
  required,
  disabled,
  autoComplete,
}: InputProps) {
  return (
    <FieldShell id={id} label={label} required={required} helpText={helpText} error={error}>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={inputClasses}
      />
    </FieldShell>
  );
}
