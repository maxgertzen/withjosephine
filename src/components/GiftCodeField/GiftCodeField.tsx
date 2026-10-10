import type { KeyboardEvent } from "react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Form/Input";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";

export type GiftCodeFieldProps = {
  id: string;
  label: string;
  checkingLabel: string;
  value: string;
  onChange: (value: string) => void;
  checking: boolean;
  error?: string;
  apply?: { label: string; onApply: () => void };
};

export function GiftCodeField({
  id,
  label,
  checkingLabel,
  value,
  onChange,
  checking,
  error,
  apply,
}: GiftCodeFieldProps) {
  const canApply = !checking && value.trim() !== "";

  function applyOnEnterInField(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && canApply)
      apply?.onApply();
  }

  return (
    <div
      {...CLARITY_MASK_PROPS}
      onKeyDown={apply ? applyOnEnterInField : undefined}
      className="flex flex-col gap-3"
    >
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
        enterKeyHint="go"
      />
      {apply ? (
        <Button
          type="button"
          variant="outlined"
          onClick={apply.onApply}
          disabled={!canApply}
          className="w-full"
        >
          {apply.label}
        </Button>
      ) : null}
    </div>
  );
}
