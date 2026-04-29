"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { type FormEvent, useMemo, useRef, useState } from "react";

import { Checkbox } from "@/components/Form/Checkbox";
import { DatePicker } from "@/components/Form/DatePicker";
import { FileUpload } from "@/components/Form/FileUpload";
import { Input } from "@/components/Form/Input";
import { MultiSelectExact } from "@/components/Form/MultiSelectExact";
import { PlaceAutocomplete } from "@/components/Form/PlaceAutocomplete";
import { Select } from "@/components/Form/Select";
import { Textarea } from "@/components/Form/Textarea";
import { TimePicker } from "@/components/Form/TimePicker";
import { buildPageSchema } from "@/lib/booking/buildPageSchema";
import { BOOKING_API_ROUTE, HONEYPOT_FIELD } from "@/lib/booking/constants";
import { derivePages, type IntakePage } from "@/lib/booking/derivePages";
import {
  isNameFollowupEnabled,
  nameFollowupKey,
} from "@/lib/booking/nameFollowup";
import { buildNameFollowupSchema } from "@/lib/booking/nameFollowupSchema";
import {
  buildSubmissionSchema,
  TIME_UNKNOWN_SENTINEL,
} from "@/lib/booking/submissionSchema";
import { errorClasses } from "@/lib/formStyles";
import type {
  SanityFormField,
  SanityFormSection,
  SanityPagination,
} from "@/lib/sanity/types";

import { PageIndicator } from "./PageIndicator";
import { PageNav } from "./PageNav";

type FieldValue = string | string[] | boolean;
type FieldValues = Record<string, FieldValue>;

type IntakeFormProps = {
  readingId: string;
  readingName: string;
  sections: SanityFormSection[];
  nonRefundableNotice: string;
  confirmationMessage?: string;
  submitLabel?: string;
  pagination?: SanityPagination;
};

function initialValueFor(field: SanityFormField): FieldValue {
  if (field.type === "multiSelectExact") return [];
  if (field.type === "consent") return false;
  return "";
}

function flattenFields(sections: SanityFormSection[]): SanityFormField[] {
  return sections.flatMap((section) => section.fields);
}

function pageFieldKeys(page: IntakePage): string[] {
  return flattenFields(page).map((field) => field.key);
}

export function IntakeForm({
  readingId,
  readingName,
  sections,
  nonRefundableNotice,
  confirmationMessage,
  submitLabel = "Continue to Payment",
  pagination,
}: IntakeFormProps) {
  const allFields = useMemo(() => flattenFields(sections), [sections]);
  const consentField = useMemo(
    () =>
      allFields.find(
        (field) => field.type === "consent" && !field.key.endsWith("_unknown"),
      ),
    [allFields],
  );
  const timeUnknownPairs = useMemo(() => {
    const pairs = new Map<string, string>();
    const fieldKeys = new Set(allFields.map((f) => f.key));
    for (const field of allFields) {
      if (field.type !== "time") continue;
      const candidate = `${field.key}_unknown`;
      if (fieldKeys.has(candidate)) pairs.set(field.key, candidate);
    }
    return pairs;
  }, [allFields]);
  const pairedUnknownKeys = useMemo(
    () => new Set(timeUnknownPairs.values()),
    [timeUnknownPairs],
  );
  const timeUnknownLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const [timeKey, unknownKey] of timeUnknownPairs) {
      const target = allFields.find((field) => field.key === unknownKey);
      if (target) labels.set(timeKey, target.label);
    }
    return labels;
  }, [allFields, timeUnknownPairs]);
  const submissionSchema = useMemo(() => buildSubmissionSchema(allFields), [allFields]);

  const pages = useMemo(
    () => derivePages(sections, { readingSlug: readingId, pagination }),
    [sections, readingId, pagination],
  );

  const [currentPage, setCurrentPage] = useState(0);
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

  const formRef = useRef<HTMLFormElement | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const totalPages = pages.length;
  const isFirstPage = currentPage === 0;
  const isFinalPage = currentPage === totalPages - 1 || totalPages === 0;
  const currentSections = pages[currentPage] ?? [];
  const currentKeys = pageFieldKeys(currentSections);

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

  function focusFirstError(fieldErrors: Record<string, string>) {
    const firstKey = Object.keys(fieldErrors)[0];
    if (!firstKey) return;
    const el = formRef.current?.querySelector<HTMLElement>(`#field-${CSS.escape(firstKey)}`);
    el?.focus();
  }

  function collectFieldErrors(
    issues: { path: PropertyKey[]; message: string }[],
  ): Record<string, string> {
    const fieldErrors: Record<string, string> = {};
    for (const issue of issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return fieldErrors;
  }

  function handleNext() {
    setSubmitError(null);
    const pageSchema = buildPageSchema(allFields, currentKeys);
    const pageResult = pageSchema.safeParse(values);
    const followupSchema = buildNameFollowupSchema(
      allFields.filter((field) => currentKeys.includes(field.key)),
      values,
    );
    const followupResult = followupSchema.safeParse(values);
    if (!pageResult.success || !followupResult.success) {
      const issues = [
        ...(pageResult.success ? [] : pageResult.error.issues),
        ...(followupResult.success ? [] : followupResult.error.issues),
      ];
      const fieldErrors = collectFieldErrors(issues);
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }
    setErrors({});
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setSubmitError(null);
    setErrors({});
    setCurrentPage((p) => Math.max(p - 1, 0));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!isFinalPage) {
      handleNext();
      return;
    }

    if (!turnstileToken) {
      setSubmitError("Please complete the verification challenge.");
      return;
    }

    const result = submissionSchema.safeParse(values);
    const followupSchema = buildNameFollowupSchema(allFields, values);
    const followupResult = followupSchema.safeParse(values);
    if (!result.success || !followupResult.success) {
      const issues = [
        ...(result.success ? [] : result.error.issues),
        ...(followupResult.success ? [] : followupResult.error.issues),
      ];
      const fieldErrors = collectFieldErrors(issues);
      setErrors(fieldErrors);
      setSubmitError("Please fix the highlighted fields and try again.");
      focusFirstError(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const companionKeys: Record<string, string> = {};
      for (const field of allFields) {
        if (field.type !== "placeAutocomplete") continue;
        const companion = `${field.key}_geonameid`;
        const v = values[companion];
        if (typeof v === "string" && v !== "") companionKeys[companion] = v;
      }

      const response = await fetch(BOOKING_API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readingSlug: readingId,
          values: { ...result.data, ...followupResult.data, ...companionKeys },
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-10"
    >
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

      {totalPages > 0 ? (
        <PageIndicator pageNumber={currentPage + 1} totalPages={totalPages} />
      ) : null}

      {currentSections.map((section) => (
        <section
          key={section._id}
          className="grid grid-cols-1 md:grid-cols-[140px_1fr] md:gap-5 gap-2 py-6 border-t border-j-border-subtle first:border-t-0 first:pt-2"
        >
          {section.marginaliaLabel ? (
            <aside className="font-display italic text-sm text-j-text-muted md:text-right md:pr-4 md:border-r md:border-j-border-subtle md:relative">
              {section.marginaliaLabel}
              <span
                aria-hidden="true"
                className="hidden md:block absolute right-[-3px] top-2 h-1.5 w-1.5 rounded-full bg-j-accent"
              />
            </aside>
          ) : (
            <span aria-hidden="true" className="hidden md:block" />
          )}

          <div>
            {section.transitionLine ? (
              <p className="font-display italic text-base text-j-text-muted mb-2">
                {section.transitionLine}
              </p>
            ) : null}
            <h2 className="font-display italic text-xl text-j-text-heading mb-3">
              {section.sectionTitle}
            </h2>
            {section.clarificationNote ? (
              <p className="font-display italic text-sm text-j-text-muted mb-4">
                {section.clarificationNote}
              </p>
            ) : null}
            {section.sectionDescription ? (
              <p className="font-body text-sm text-j-text-muted leading-relaxed mb-4">
                {section.sectionDescription}
              </p>
            ) : null}

            <div className="flex flex-col gap-6">
              {section.fields
                .filter((field) => {
                  if (field.type === "consent") return false;
                  if (pairedUnknownKeys.has(field.key)) return false;
                  return true;
                })
                .map((field) =>
                  renderField(field, {
                    values,
                    setValue,
                    errors,
                    disabled: isSubmitting,
                    timeUnknownPairs,
                    timeUnknownLabels,
                  }),
                )}
            </div>
          </div>
        </section>
      ))}

      {isFinalPage && consentField ? (
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

      {isFinalPage && turnstileSiteKey ? (
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

      <PageNav
        isFirstPage={isFirstPage}
        isFinalPage={isFinalPage}
        backHref={`/book/${readingId}`}
        onBack={handleBack}
        onNext={handleNext}
        isSubmitting={isSubmitting}
        submitDisabled={isFinalPage && !turnstileToken}
        submitLabel={submitLabel}
      />

      <p className="sr-only">{`Booking form for ${readingName}`}</p>
    </form>
  );
}

type RenderContext = {
  values: FieldValues;
  setValue: (key: string, value: FieldValue) => void;
  errors: Record<string, string>;
  disabled: boolean;
  timeUnknownPairs: Map<string, string>;
  timeUnknownLabels: Map<string, string>;
};

function renderField(field: SanityFormField, ctx: RenderContext) {
  const { values, setValue, errors, disabled, timeUnknownPairs, timeUnknownLabels } = ctx;
  const id = `field-${field.key}`;
  const error = errors[field.key];
  const value = values[field.key];
  const shellProps = {
    helpText: field.helpText,
    helperPosition: field.helperPosition,
    clarificationNote: field.clarificationNote,
  };

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
          {...shellProps}
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
          {...shellProps}
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
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "time": {
      const unknownKey = timeUnknownPairs.get(field.key);
      const unknownChecked = unknownKey ? values[unknownKey] === true : false;
      const timeValue =
        typeof value === "string" && value !== TIME_UNKNOWN_SENTINEL ? value : "";
      const unknownLabel = unknownKey ? timeUnknownLabels.get(field.key) : undefined;

      return (
        <TimePicker
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={unknownChecked ? TIME_UNKNOWN_SENTINEL : timeValue}
          onChange={(next) => setValue(field.key, next)}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
          unknownToggle={
            unknownKey && unknownLabel
              ? {
                  label: unknownLabel,
                  checked: unknownChecked,
                  onChange: (checked) => {
                    setValue(unknownKey, checked);
                    setValue(field.key, checked ? TIME_UNKNOWN_SENTINEL : "");
                  },
                }
              : undefined
          }
        />
      );
    }

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
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "multiSelectExact": {
      const followupValues: Record<string, string> = {};
      for (const option of field.options ?? []) {
        if (!isNameFollowupEnabled(option)) continue;
        const v = values[nameFollowupKey(option.value)];
        followupValues[option.value] = typeof v === "string" ? v : "";
      }
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
          nameFollowupValues={followupValues}
          onNameFollowupChange={(optionValue, text) =>
            setValue(nameFollowupKey(optionValue), text)
          }
        />
      );
    }

    case "fileUpload":
      return (
        <FileUpload
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "placeAutocomplete":
      return (
        <PlaceAutocomplete
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          onGeonameIdChange={(geonameid) =>
            setValue(`${field.key}_geonameid`, geonameid === null ? "" : String(geonameid))
          }
          placeholder={field.placeholder}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}
