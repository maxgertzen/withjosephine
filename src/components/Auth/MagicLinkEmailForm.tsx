"use client";

import { type FocusEvent, useId, useState } from "react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Form/Input";
import { isValidAuthEmail } from "@/lib/auth/emailValidation";

type Props = {
  action: string;
  submitLabel: string;
  emailLabel: string;
  hiddenFields?: Record<string, string>;
  invalidEmailMessage?: string;
};

const DEFAULT_INVALID_MESSAGE = "Please enter a valid email address.";

export function MagicLinkEmailForm({
  action,
  submitLabel,
  emailLabel,
  hiddenFields,
  invalidEmailMessage = DEFAULT_INVALID_MESSAGE,
}: Props) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const isValid = isValidAuthEmail(email);
  const hasContent = email.trim().length > 0;
  const showError = touched && hasContent && !isValid;

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).id === inputId) setTouched(true);
  }

  return (
    <form method="POST" action={action} encType="application/x-www-form-urlencoded" className="mt-8">
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      <div onBlur={handleBlur}>
        <Input
          id={inputId}
          name="email"
          label={emailLabel}
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          inputMode="email"
          error={showError ? invalidEmailMessage : undefined}
        />
      </div>
      <div className="mt-6">
        <Button type="submit" size="lg" className="w-full" disabled={!isValid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
