"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useHeaderBack } from "@/components/BookingFlowHeader/headerBackContext";
import { track } from "@/lib/analytics";
import {
  emptyConsentSnapshot,
  isFullyConsented,
  type LegalConsentSnapshot,
} from "@/lib/compliance/intakeConsent";
import { focusFirstError } from "@/lib/intake/intakeValidation";
import { useAutosave } from "@/lib/intake/useAutosave";
import { useDraftRestore } from "@/lib/intake/useDraftRestore";
import { useFieldFocusTelemetry } from "@/lib/intake/useFieldFocusTelemetry";
import { useIntakeFormHandlers } from "@/lib/intake/useIntakeFormHandlers";
import { pageFieldKeys, useIntakeSchema } from "@/lib/intake/useIntakeSchema";
import { usePageErrors } from "@/lib/intake/usePageErrors";
import { useTurnstileChallenge } from "@/lib/intake/useTurnstileChallenge";
import type { SanityFormSection, SanityPagination } from "@/lib/sanity/types";

import { IntakeFormBody } from "./IntakeFormBody";
import type { LegalAcknowledgmentsErrors } from "./LegalAcknowledgments";
import type { RenderContext } from "./renderField";
import { SavedIndicator } from "./SavedIndicator";
import { SwapToast } from "./SwapToast";

type IntakeFormProps = {
  readingId: string;
  readingName: string;
  sections: SanityFormSection[];
  nonRefundableNotice: string;
  submitLabel?: string;
  nextLabel?: string;
  saveLaterLabel?: string;
  pageIndicatorTagline?: string;
  pagination?: SanityPagination;
  loadingStateCopy?: string;
};

export function IntakeForm({
  readingId,
  readingName,
  sections,
  nonRefundableNotice,
  submitLabel,
  nextLabel,
  saveLaterLabel,
  pageIndicatorTagline,
  pagination,
  loadingStateCopy,
}: IntakeFormProps) {
  const {
    allFields,
    pages,
    totalPages,
    submissionSchema,
    timeUnknownPairs,
    timeUnknownLabels,
    pairedUnknownKeys,
    defaultValues,
    defaultValuesSnapshot,
  } = useIntakeSchema({ sections, readingId, pagination });

  const {
    values,
    setValues,
    currentPage,
    setCurrentPage,
    lastSavedAt,
    setLastSavedAt,
    isRestored,
    swappedFromReadingName,
    dismissSwapToast,
  } = useDraftRestore({
    readingId,
    readingName,
    defaultValues,
  });

  const [honeypot, setHoneypot] = useState("");
  const {
    turnstileRequired,
    turnstileSiteKey,
    turnstileToken,
    turnstileRef,
    handleSuccess: handleTurnstileSuccess,
    handleFailure: handleTurnstileFailure,
    requestFreshToken: requestFreshTurnstileToken,
  } = useTurnstileChallenge();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentSnapshot, setConsentSnapshot] = useState<LegalConsentSnapshot>(() =>
    emptyConsentSnapshot({ readingSlug: readingId }),
  );
  const [consentErrors, setConsentErrors] = useState<LegalAcknowledgmentsErrors>({});
  const clearConsentError = useCallback(
    (key: keyof LegalAcknowledgmentsErrors) =>
      setConsentErrors((prev) => {
        if (prev[key] === undefined) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }),
    [],
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track the page index where errors were last revealed; when the user
  // navigates away (Next, Previous, or Review-edit jump), the visibility
  // automatically resets without firing a state-mutating effect.
  const [revealedOnPage, setRevealedOnPage] = useState<number | null>(null);
  const errorsVisible = revealedOnPage === currentPage;
  const revealErrors = useCallback(() => setRevealedOnPage(currentPage), [currentPage]);

  const { chipTick, valuesUntouched, flushSave, handleSaveLater, handleDiscardDraft } = useAutosave(
    {
      values,
      currentPage,
      defaultValues,
      defaultValuesSnapshot,
      isRestored,
      readingId,
      setValues,
      setCurrentPage,
      setLastSavedAt,
      lastSavedAt,
      onAfterDiscard: () => {
        setErrors({});
        setSubmitError(null);
      },
    },
  );

  const savedIndicator = <SavedIndicator lastSavedAt={lastSavedAt} chipTick={chipTick} />;

  const formRef = useRef<HTMLFormElement | null>(null);
  const submitIntentRef = useRef(false);

  useFieldFocusTelemetry({ formRef, readingId, currentPage });

  const isFirstPage = currentPage === 0;
  const isFinalPage = currentPage === totalPages - 1 || totalPages === 0;
  const currentSections = useMemo(() => pages[currentPage] ?? [], [pages, currentPage]);
  const currentKeys = useMemo(() => pageFieldKeys(currentSections), [currentSections]);

  useEffect(() => {
    if (!isRestored) return;
    if (totalPages === 0) return;
    track("intake_page_view", {
      reading_id: readingId,
      page_number: currentPage + 1,
      total_pages: totalPages,
    });
  }, [isRestored, readingId, currentPage, totalPages]);

  const { pageErrors, firstErrorKey, firstFieldLabel, errorCount } = usePageErrors({
    allFields,
    currentKeys,
    values,
  });

  const jumpToFirstError = useCallback(() => {
    if (!firstErrorKey) return;
    focusFirstError(formRef.current, firstErrorKey, { scroll: true });
  }, [firstErrorKey]);

  const { setValue, handleNext, handleBack, handleReviewEdit, handleSubmit } =
    useIntakeFormHandlers({
      readingId,
      formRef,
      submitIntentRef,
      values,
      setValues,
      allFields,
      currentPage,
      setCurrentPage,
      totalPages,
      isFinalPage,
      currentKeys,
      submissionSchema,
      setErrors,
      setSubmitError,
      setIsSubmitting,
      consentSnapshot,
      setConsentErrors,
      honeypot,
      turnstileRequired,
      turnstileToken,
      requestFreshTurnstileToken,
      flushSave,
    });

  // Let the shell header's back arrow step through form pages: register
  // handleBack while past the first page, so the top arrow only leaves the
  // form (to the previous funnel step) once there's no earlier page.
  const { setOnBack } = useHeaderBack();
  useEffect(() => {
    setOnBack(currentPage > 0 ? handleBack : null);
    return () => setOnBack(null);
  }, [currentPage, handleBack, setOnBack]);

  const mergedErrors = useMemo(
    () => (errorsVisible ? { ...errors, ...pageErrors } : {}),
    [errors, pageErrors, errorsVisible],
  );

  const visibleErrorCount = errorsVisible ? errorCount : 0;
  const visibleFirstFieldLabel = errorsVisible ? firstFieldLabel : null;
  const consentsFullySatisfied = useMemo(
    () => isFullyConsented(consentSnapshot, { requireArt9: true, requireCoolingOff: true }),
    [consentSnapshot],
  );
  const submitGateInvalid = errorCount > 0 || (isFinalPage && !consentsFullySatisfied);

  const handleConsentSnapshotChange = useCallback(
    (next: LegalConsentSnapshot) => {
      setConsentSnapshot(next);
      if (isFullyConsented(next, { requireArt9: true, requireCoolingOff: true })) setSubmitError(null);
    },
    [],
  );

  const renderContext = useMemo<RenderContext>(
    () => ({
      values,
      setValue,
      errors: mergedErrors,
      disabled: isSubmitting,
      timeUnknownPairs,
      timeUnknownLabels,
      requestTurnstileToken: requestFreshTurnstileToken,
    }),
    [
      values,
      setValue,
      mergedErrors,
      isSubmitting,
      timeUnknownPairs,
      timeUnknownLabels,
      requestFreshTurnstileToken,
    ],
  );

  return (
    <>
      {swappedFromReadingName ? (
        <SwapToast readingName={swappedFromReadingName} onDismiss={dismissSwapToast} />
      ) : null}
      <IntakeFormBody
        formRef={formRef}
        submitIntentRef={submitIntentRef}
        handleSubmit={handleSubmit}
        readingId={readingId}
        readingName={readingName}
        loadingStateCopy={loadingStateCopy}
        pageIndicatorTagline={pageIndicatorTagline}
        submitLabel={submitLabel}
        nextLabel={nextLabel}
        saveLaterLabel={saveLaterLabel}
        nonRefundableNotice={nonRefundableNotice}
        honeypot={honeypot}
        setHoneypot={setHoneypot}
        isSubmitting={isSubmitting}
        isFinalPage={isFinalPage}
        isFirstPage={isFirstPage}
        currentPage={currentPage}
        totalPages={totalPages}
        errorCount={visibleErrorCount}
        firstFieldLabel={visibleFirstFieldLabel}
        onJumpToFirstError={jumpToFirstError}
        submitDisabled={submitGateInvalid}
        onAdvanceAttempt={revealErrors}
        valuesUntouched={valuesUntouched}
        values={values}
        pages={pages}
        currentSections={currentSections}
        pairedUnknownKeys={pairedUnknownKeys}
        renderContext={renderContext}
        lastSavedAt={lastSavedAt}
        savedIndicator={savedIndicator}
        consentSnapshot={consentSnapshot}
        setConsentSnapshot={handleConsentSnapshotChange}
        consentErrors={consentErrors}
        clearConsentError={clearConsentError}
        showCoolingOff={true}
        turnstileRequired={turnstileRequired}
        turnstileSiteKey={turnstileSiteKey}
        turnstileRef={turnstileRef}
        handleTurnstileSuccess={handleTurnstileSuccess}
        handleTurnstileFailure={handleTurnstileFailure}
        submitError={submitError}
        handleNext={handleNext}
        handleBack={handleBack}
        handleReviewEdit={handleReviewEdit}
        handleSaveLater={handleSaveLater}
        handleDiscardDraft={handleDiscardDraft}
      />
    </>
  );
}
