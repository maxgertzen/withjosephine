import type { ComponentProps } from "react";

import { Input } from "@/components/Form/Input";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";

export type GiftCodeFieldProps = {
  id: string;
  label: string;
  checkingLabel: string;
  enterKeyHint?: ComponentProps<typeof Input>["enterKeyHint"];
  value: string;
  onChange: (value: string) => void;
  checking: boolean;
  error?: string;
};

export function GiftCodeField({
  id,
  label,
  checkingLabel,
  enterKeyHint,
  value,
  onChange,
  checking,
  error,
}: GiftCodeFieldProps) {
  return (
    <div {...CLARITY_MASK_PROPS}>
      <Input
        id={id}
        name="giftCode"
        label={label}
        value={value}
        onChange={onChange}
        variant="code"
        helpText={checking ? checkingLabel : undefined}
        error={error}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
      />
    </div>
  );
}
