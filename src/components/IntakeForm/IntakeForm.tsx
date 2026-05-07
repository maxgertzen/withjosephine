"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Checkbox } from "@/components/Form/Checkbox";
import { DatePicker } from "@/components/Form/DatePicker";
import { FileUpload } from "@/components/Form/FileUpload";
import { Input } from "@/components/Form/Input";
import { MultiSelectExact } from "@/components/Form/MultiSelectExact";
import { PlaceAutocomplete } from "@/components/Form/PlaceAutocomplete";
import { Select } from "@/components/Form/Select";
import { Textarea } from "@/components/Form/Textarea";
import { TimePicker } from "@/components/Form/TimePicker";
import { identifySubmission, track, trackThrottled } from "@/lib/analytics";
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
import {
  clear as clearDraft,
  type DraftValues,
  getLastReadingId,
  restore as restoreDraft,
  save as saveDraft,
  setLastReadingId,
} from "@/lib/intake/localStorageDraft";
import type {
  SanityFormField,
  SanityFormSection,
  SanityPagination,
} from "@/lib/sanity/types";

import { DiscardDraftButton } from "./DiscardDraftButton";
import { PageIndicator } from "./PageIndicator";
import { PageNav } from "./PageNav";
import { SavedIndicator } from "./SavedIndicator";
import { SubmitOverlay } from "./SubmitOverlay";
import { SwapToast } from "./SwapToast";

type FieldValue = string | string[] | boolean;
type FieldValues = Record<string, FieldValue>;

// Throttle the `intake_save_auto` Mixpanel event to once per 30s. The
// localStorage flush still happens every 500ms; only the analytics event
// is rate-limited to keep the funnel signal-to-noise high.
const SAVE_AUTO_TRACK_INTERVAL_MS = 30_000;

type IntakeFormProps = {
  readingId: string;
  readingName: string;
  sections: SanityFormSection[];
  nonRefundableNotice: string;
  submitLabel?: string;
  pagination?: SanityPagination;
  loadingStateCopy?: string;
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

const SWAP_PRESERVED_KEYS = [
  "email",
  "first_name",
  "middle_name",
  "last_name",
  "legal_full_name",
  "anything_else",
] as const;

function pickPreservedFields(values: DraftValues): Partial<FieldValues> {
  const result: Partial<FieldValues> = {};
  for (const key of SWAP_PRESERVED_KEYS) {
    if (key in values) result[key] = values[key];
  }
  return result;
}

export function IntakeForm({
  readingId,
  readingName,
  sections,
  nonRefundableNotice,
  submitLabel = "Continue to Payment",
  pagination,
  loadingStateCopy,
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

  const defaultValues = useMemo<FieldValues>(() => {
    const seed: FieldValues = {};
    for (const field of allFields) {
      seed[field.key] = initialValueFor(field);
    }
    return seed;
  }, [allFields]);

  const [currentPage, setCurrentPage] = useState(0);
  const [values, setValues] = useState<FieldValues>(defaultValues);
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const turnstileResolverRef = useRef<((token: string | null) => void) | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [chipTick, setChipTick] = useState(0);
  const [isRestored, setIsRestored] = useState(false);
  const [swappedFromReadingName, setSwappedFromReadingName] = useState<string | null>(null);
  const restoredForReadingRef = useRef<string | null>(null);

  useEffect(() => {
    if (restoredForReadingRef.current === readingId) return;
    const previousReadingId = getLastReadingId();
    let preservedFromSwap: Partial<FieldValues> | null = null;
    if (previousReadingId && previousReadingId !== readingId) {
      const previousDraft = restoreDraft(previousReadingId);
      if (previousDraft) {
        preservedFromSwap = pickPreservedFields(previousDraft.values);
        setSwappedFromReadingName(readingName);
      }
    }
    const restored = restoreDraft(readingId);
    const seeded = {
      ...defaultValues,
      ...(restored?.values ?? {}),
      ...(preservedFromSwap ?? {}),
    } as FieldValues;
    setValues(seeded);
    if (typeof restored?.currentPage === "number") {
      setCurrentPage(restored.currentPage);
    }
    if (restored?.savedAt) {
      const parsed = new Date(restored.savedAt);
      if (!Number.isNaN(parsed.getTime())) setLastSavedAt(parsed);
    }
    setLastReadingId(readingId);
    restoredForReadingRef.current = readingId;
    setIsRestored(true);
  }, [readingId, readingName, defaultValues]);

  useEffect(() => {
    if (!lastSavedAt) return;
    const interval = setInterval(() => setChipTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const savedIndicator = <SavedIndicator lastSavedAt={lastSavedAt} chipTick={chipTick} />;

  const formRef = useRef<HTMLFormElement | null>(null);
  const submitIntentRef = useRef(false);
  // One-shot guard: set when the user discards a draft so the next autosave
  // tick (which would otherwise fire 500ms after the reset and re-save the
  // empty defaults) is skipped. The flag clears itself on the next tick.
  const justDiscardedRef = useRef(false);

  function flushSave(nextValues: FieldValues, nextPage: number) {
    const envelope = saveDraft(readingId, {
      currentPage: nextPage,
      values: nextValues as DraftValues,
    });
    if (envelope) setLastSavedAt(new Date(envelope.savedAt));
  }

  useEffect(() => {
    if (!isRestored) return;
    if (justDiscardedRef.current) {
      justDiscardedRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      flushSave(values, currentPage);
      trackThrottled(
        "intake_save_auto",
        { reading_id: readingId, page_number: currentPage + 1 },
        SAVE_AUTO_TRACK_INTERVAL_MS,
      );
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestored, values, currentPage, readingId]);

  // First-focus tracking: one event per field per session via delegated
  // focusin so we don't have to thread onFocus through every form component.
  const focusedFieldsRef = useRef<Set<string>>(new Set());
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    function onFocusIn(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      const id = target?.id ?? "";
      if (!id.startsWith("field-")) return;
      const fieldKey = id.slice("field-".length);
      if (focusedFieldsRef.current.has(fieldKey)) return;
      focusedFieldsRef.current.add(fieldKey);
      track("intake_field_first_focus", {
        reading_id: readingId,
        field_key: fieldKey,
        page_number: currentPageRef.current + 1,
      });
    }
    form.addEventListener("focusin", onFocusIn);
    return () => form.removeEventListener("focusin", onFocusIn);
  }, [readingId]);

  function handleSaveLater() {
    flushSave(values, currentPage);
    setChipTick((t) => t + 1);
    track("intake_save_click", { reading_id: readingId, page_number: currentPage + 1 });
  }

  function handleDiscardDraft() {
    track("intake_clear_draft_click", {
      reading_id: readingId,
      page_number: currentPage + 1,
    });
    justDiscardedRef.current = true;
    clearDraft(readingId);
    setValues(defaultValues);
    setCurrentPage(0);
    setLastSavedAt(null);
    setErrors({});
    setSubmitError(null);
  }

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileBypass =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS === "1";
  const turnstileRequired = Boolean(turnstileSiteKey) && !turnstileBypass;

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    turnstileResolverRef.current?.(token);
    turnstileResolverRef.current = null;
  }, []);

  const handleTurnstileFailure = useCallback(() => {
    setTurnstileToken(null);
    turnstileResolverRef.current?.(null);
    turnstileResolverRef.current = null;
  }, []);

  const requestFreshTurnstileToken = useCallback(async (): Promise<string | null> => {
    // Dev-only explicit bypass via NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS=1.
    // Never falls through to bypass when site key is missing in prod —
    // sending a magic string to a real Turnstile-gated endpoint just gives
    // the user "Verification failed" with no actionable signal.
    if (turnstileBypass) return "bypass";
    if (!turnstileSiteKey || !turnstileRef.current) return null;
    return new Promise<string | null>((resolve) => {
      turnstileResolverRef.current = resolve;
      turnstileRef.current?.reset();
      turnstileRef.current?.execute();
    });
  }, [turnstileBypass, turnstileSiteKey]);

  const totalPages = pages.length;
  const isFirstPage = currentPage === 0;
  const isFinalPage = currentPage === totalPages - 1 || totalPages === 0;
  const currentSections = pages[currentPage] ?? [];
  const currentKeys = pageFieldKeys(currentSections);

  // Wait for restore so we don't double-fire when localStorage hydrates a draft.
  useEffect(() => {
    if (!isRestored) return;
    if (totalPages === 0) return;
    track("intake_page_view", {
      reading_id: readingId,
      page_number: currentPage + 1,
      total_pages: totalPages,
    });
  }, [isRestored, readingId, currentPage, totalPages]);

  const currentPageValid = useMemo(() => {
    const pageSchema = buildPageSchema(allFields, currentKeys);
    const followupSchema = buildNameFollowupSchema(
      allFields.filter((field) => currentKeys.includes(field.key)),
      values,
    );
    const pageResult = pageSchema.safeParse(values);
    const followupResult = followupSchema.safeParse(values);
    return pageResult.success && followupResult.success;
  }, [allFields, currentKeys, values]);

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
    const validationPass = pageResult.success && followupResult.success;
    track("intake_page_next_click", {
      reading_id: readingId,
      page_number: currentPage + 1,
      validation_pass: validationPass,
    });
    if (!validationPass) {
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
    const nextPage = Math.min(currentPage + 1, totalPages - 1);
    setCurrentPage(nextPage);
    flushSave(values, nextPage);
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setSubmitError(null);
    setErrors({});
    const nextPage = Math.max(currentPage - 1, 0);
    track("intake_page_back_click", {
      reading_id: readingId,
      from_page: currentPage + 1,
      to_page: nextPage + 1,
    });
    setCurrentPage(nextPage);
    flushSave(values, nextPage);
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!submitIntentRef.current) {
      return;
    }
    submitIntentRef.current = false;

    setSubmitError(null);

    if (!isFinalPage) {
      handleNext();
      return;
    }

    const preflight = submissionSchema.safeParse(values);
    const preflightFollowup = buildNameFollowupSchema(allFields, values).safeParse(values);
    track("intake_submit_click", {
      reading_id: readingId,
      validation_pass: preflight.success && preflightFollowup.success,
    });

    let submissionTurnstileToken: string | null = turnstileToken;
    if (turnstileRequired) {
      submissionTurnstileToken = await requestFreshTurnstileToken();
      if (!submissionTurnstileToken) {
        setSubmitError("Please complete the verification challenge.");
        track("intake_submit_error", { reading_id: readingId, error_code: "turnstile_failed" });
        return;
      }
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
      track("intake_submit_error", { reading_id: readingId, error_code: "validation_failed" });
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
          turnstileToken: submissionTurnstileToken ?? "",
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
        setIsSubmitting(false);
        track("intake_submit_error", {
          reading_id: readingId,
          error_code: `http_${response.status}`,
        });
        return;
      }

      const data = (await response.json()) as { paymentUrl?: string; submissionId?: string };
      if (!data.paymentUrl || !data.submissionId) {
        setSubmitError("Unexpected response. Please try again.");
        setIsSubmitting(false);
        track("intake_submit_error", { reading_id: readingId, error_code: "missing_payment_url" });
        return;
      }

      track("intake_submit_success", { reading_id: readingId });
      identifySubmission(data.submissionId);
      track("stripe_redirect", { reading_id: readingId, submission_id: data.submissionId });

      // Keep isSubmitting=true so the SubmitOverlay stays up until the
      // browser finishes navigating to Stripe; otherwise the overlay would
      // flicker off for one render before the page unloads.
      try {
        clearDraft(readingId);
      } catch {
        // localStorage failures must not block the redirect.
      }
      window.location.href = data.paymentUrl;
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
      track("intake_submit_error", { reading_id: readingId, error_code: "network_error" });
    }
  }

  return (
    <>
      {swappedFromReadingName ? (
        <SwapToast
          readingName={swappedFromReadingName}
          onDismiss={() => setSwappedFromReadingName(null)}
        />
      ) : null}
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        const target = event.target as HTMLElement;
        const tag = target.tagName;
        if (tag === "TEXTAREA") return;
        if (tag === "BUTTON" && (target as HTMLButtonElement).type === "submit") return;
        event.preventDefault();
      }}
      noValidate
      className="relative flex flex-col gap-10"
    >
      {isSubmitting ? <SubmitOverlay text={loadingStateCopy} /> : null}
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
                    requestTurnstileToken: requestFreshTurnstileToken,
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

      {turnstileRequired && turnstileSiteKey ? (
        <div className="sr-only" aria-hidden="true">
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            options={{ execution: "execute", appearance: "interaction-only" }}
            onSuccess={handleTurnstileSuccess}
            onExpire={handleTurnstileFailure}
            onError={handleTurnstileFailure}
          />
        </div>
      ) : null}

      {submitError ? (
        <p role="alert" className={errorClasses}>
          {submitError}
        </p>
      ) : null}

      {!currentPageValid ? (
        <p
          role="status"
          aria-live="polite"
          className="font-body text-xs italic text-j-text-muted text-center mt-4"
        >
          Please complete the required fields above.
        </p>
      ) : null}

      <PageNav
        isFirstPage={isFirstPage}
        isFinalPage={isFinalPage}
        backHref={`/book/${readingId}`}
        onBack={handleBack}
        onNext={handleNext}
        onSaveLater={handleSaveLater}
        onSubmitIntent={() => {
          submitIntentRef.current = true;
        }}
        isSubmitting={isSubmitting}
        nextDisabled={!currentPageValid}
        submitDisabled={isFinalPage && !currentPageValid}
        submitLabel={submitLabel}
        savedIndicator={savedIndicator}
        discardDraftButton={
          lastSavedAt ? <DiscardDraftButton onConfirm={handleDiscardDraft} /> : null
        }
      />

      <p className="sr-only">{`Booking form for ${readingName}`}</p>
    </form>
    </>
  );
}

type RenderContext = {
  values: FieldValues;
  setValue: (key: string, value: FieldValue) => void;
  errors: Record<string, string>;
  disabled: boolean;
  timeUnknownPairs: Map<string, string>;
  timeUnknownLabels: Map<string, string>;
  requestTurnstileToken: () => Promise<string | null>;
};

function renderField(field: SanityFormField, ctx: RenderContext) {
  const {
    values,
    setValue,
    errors,
    disabled,
    timeUnknownPairs,
    timeUnknownLabels,
    requestTurnstileToken,
  } = ctx;
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
          minAge={field.key === "date_of_birth" ? 18 : undefined}
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
          requestTurnstileToken={requestTurnstileToken}
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
