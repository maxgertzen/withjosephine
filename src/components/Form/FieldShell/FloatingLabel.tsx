import { floatingLabelClasses, floatingLabelMultilineClasses } from "@/lib/formStyles";

type FloatingLabelProps = {
  id: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
};

export function FloatingLabel({ id, label, required, multiline = false }: FloatingLabelProps) {
  return (
    <label
      htmlFor={id}
      className={multiline ? floatingLabelMultilineClasses : floatingLabelClasses}
    >
      {label}
      {required ? <span aria-hidden="true"> *</span> : null}
    </label>
  );
}
