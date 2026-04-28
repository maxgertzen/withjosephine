"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Form/Checkbox";
import { DatePicker } from "@/components/Form/DatePicker";
import { FileUpload } from "@/components/Form/FileUpload";
import { Input } from "@/components/Form/Input";
import { MultiSelectExact } from "@/components/Form/MultiSelectExact";
import { Select } from "@/components/Form/Select";
import { Textarea } from "@/components/Form/Textarea";
import { TimePicker } from "@/components/Form/TimePicker";
import { BOOKING_API_ROUTE, HONEYPOT_FIELD } from "@/lib/booking/constants";
import { buildSubmissionSchema } from "@/lib/booking/submissionSchema";
import { errorClasses } from "@/lib/formStyles";
import type { SanityFormField, SanityFormSection } from "@/lib/sanity/types";

type FieldValue = string | string[] | boolean;
type FieldValues = Record<string, FieldValue>;

type IntakeFormProps = {
  readingId: string;
  readingName: string;
  sections: SanityFormSection[];
  nonRefundableNotice: string;
  confirmationMessage?: string;
  submitLabel?: string;
};

function initialValueFor(field: SanityFormField): FieldValue {
  if (field.type === "multiSelectExact") return [];
  if (field.type === "consent") return false;
  return "";
}

function flattenFields(sections: SanityFormSection[]): SanityFormField[] {
  return sections.flatMap((section) => section.fields);
}

export function IntakeForm({
  readingId,
  readingName,
  sections,
  nonRefundableNotice,
  confirmationMessage,
  submitLabel = "Continue to Payment",
}: IntakeFormProps) {
  const allFields = useMemo(() => flattenFields(sections), [sections]);
  const consentField = useMemo(
    () => allFields.find((field) => field.type === "consent"),
    [allFields],
  );
  const submissionSchema = useMemo(() => buildSubmissionSchema(allFields), [allFields]);

  const [values, setValues] = useState<FieldValues>(() => {
    const seed: FieldValues = {};
    for (const field of allFields) {
      seed[field.key] = initialValueFor(field);
    }
    return seed;
  });
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSucceeded, setIsSucceeded] = useState(false);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  function setValue(key: string, value: FieldValue) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!turnstileToken) {
      setSubmitError("Please complete the verification challenge.");
      return;
    }

    const result = submissionSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setSubmitError("Please fix the highlighted fields and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(BOOKING_API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readingSlug: readingId,
          values: result.data,
          turnstileToken,
          [HONEYPOT_FIELD]: honeypot,
          consentLabelSnapshot: consentField?.label ?? "",
        }),
      });

      if (!response.ok) {
        const message =
          response.status === 400
            ? "Some fields didn't pass validation. Please review and try again."
            : "Something went wrong submitting your form. Please try again.";
        setSubmitError(message);
        return;
      }

      const data = (await response.json()) as { paymentUrl?: string };
      if (!data.paymentUrl) {
        setSubmitError("Unexpected response. Please try again.");
        return;
      }

      setIsSucceeded(true);
      window.location.href = data.paymentUrl;
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSucceeded && confirmationMessage) {
    return (
      <p className="font-display text-lg italic text-j-text leading-relaxed">
        {confirmationMessage}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">
      <input
        type="text"
        name={HONEYPOT_FIELD}
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {sections.map((section) => (
        <section key={section._id} className="flex flex-col gap-6">
          <header>
            <h2 className="font-display text-2xl italic text-j-text-heading">
              {section.sectionTitle}
            </h2>
            {section.sectionDescription ? (
              <p className="font-body text-sm text-j-text-muted leading-relaxed mt-2">
                {section.sectionDescription}
              </p>
            ) : null}
          </header>

          <div className="flex flex-col gap-6">
            {section.fields
              .filter((field) => field.type !== "consent")
              .map((field) => renderField(field, values, setValue, errors, isSubmitting))}
          </div>
        </section>
      ))}

      {consentField ? (
        <section className="flex flex-col gap-4 bg-j-warm/40 border border-j-border-subtle rounded-2xl p-6">
          <p className="font-body text-sm text-j-text-muted leading-relaxed whitespace-pre-line">
            {nonRefundableNotice}
          </p>
          <Checkbox
            id={`field-${consentField.key}`}
            name={consentField.key}
            checked={values[consentField.key] === true}
            onChange={(checked) => setValue(consentField.key, checked)}
            error={errors[consentField.key]}
            disabled={isSubmitting}
            required={consentField.required}
          >
            {consentField.label}
          </Checkbox>
        </section>
      ) : null}

      {turnstileSiteKey ? (
        <div className="flex justify-center">
          <Turnstile
            siteKey={turnstileSiteKey}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
        </div>
      ) : null}

      {submitError ? (
        <p role="alert" className={errorClasses}>
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full text-center"
        disabled={isSubmitting || !turnstileToken}
      >
        {isSubmitting ? "Submitting\u2026" : submitLabel}
      </Button>

      <p className="sr-only">{`Booking form for ${readingName}`}</p>
    </form>
  );
}

function renderField(
  field: SanityFormField,
  values: FieldValues,
  setValue: (key: string, value: FieldValue) => void,
  errors: Record<string, string>,
  disabled: boolean,
) {
  const id = `field-${field.key}`;
  const error = errors[field.key];
  const value = values[field.key];

  switch (field.type) {
    case "shortText":
    case "email":
      return (
        <Input
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          type={field.type === "email" ? "email" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          placeholder={field.placeholder}
          helpText={field.helpText}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "longText":
      return (
        <Textarea
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          placeholder={field.placeholder}
          helpText={field.helpText}
          error={error}
          required={field.required}
          disabled={disabled}
          maxLength={field.validation?.maxLength}
        />
      );

    case "date":
      return (
        <DatePicker
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          helpText={field.helpText}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "time":
      return (
        <TimePicker
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          helpText={field.helpText}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "select":
      return (
        <Select
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          options={field.options ?? []}
          placeholder={field.placeholder}
          helpText={field.helpText}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "multiSelectExact":
      return (
        <MultiSelectExact
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={Array.isArray(value) ? value : []}
          onChange={(next) => setValue(field.key, next)}
          options={field.options ?? []}
          count={field.multiSelectCount ?? 0}
          helpText={field.helpText}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "fileUpload":
      return (
        <FileUpload
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          helpText={field.helpText}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}
