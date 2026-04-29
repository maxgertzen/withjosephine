import { FieldShell } from "@/components/Form/FieldShell";
import { inputClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

type InputProps = {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "decimal" | "tel" | "url" | "search";
  autoCapitalize?: string;
  spellCheck?: boolean;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
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
  helperPosition,
  clarificationNote,
  error,
  required,
  disabled,
  autoComplete,
  inputMode,
  autoCapitalize,
  spellCheck,
  enterKeyHint,
}: InputProps) {
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
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete ?? (type === "email" ? "email" : undefined)}
        inputMode={inputMode ?? (type === "email" ? "email" : undefined)}
        autoCapitalize={autoCapitalize ?? (type === "email" ? "none" : undefined)}
        spellCheck={spellCheck}
        enterKeyHint={enterKeyHint}
        aria-invalid={error ? true : undefined}
        className={inputClasses}
      />
    </FieldShell>
  );
}
