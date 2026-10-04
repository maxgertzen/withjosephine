import { HONEYPOT_FIELD } from "@/lib/booking/constants";

type HoneypotFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function HoneypotField({ value, onChange }: HoneypotFieldProps) {
  return (
    <input
      type="text"
      name={HONEYPOT_FIELD}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="absolute left-[-9999px] h-0 w-0 opacity-0"
    />
  );
}
