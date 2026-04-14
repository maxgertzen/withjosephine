import { inputClasses, labelClasses } from "@/lib/formStyles";

type SharedProps = {
  id: string;
  label: string;
};

type InputFieldProps = SharedProps & {
  as?: "input";
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "className">;

type TextareaFieldProps = SharedProps & {
  as: "textarea";
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className">;

type FormFieldProps = InputFieldProps | TextareaFieldProps;

export function FormField({ id, label, as = "input", ...props }: FormFieldProps) {
  const Element = as;

  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Element id={id} className={inputClasses} {...(props as any)} />
    </div>
  );
}
