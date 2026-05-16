"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import {
  emptyConsentSnapshot,
  type LegalConsentSnapshot,
} from "@/lib/compliance/intakeConsent";
import { validateCurrentPage } from "@/lib/intake/intakeValidation";
import { useAutosave } from "@/lib/intake/useAutosave";
import { useDraftRestore } from "@/lib/intake/useDraftRestore";
import { useFieldFocusTelemetry } from "@/lib/intake/useFieldFocusTelemetry";
import { useIntakeFormHandlers } from "@/lib/intake/useIntakeFormHandlers";
import { pageFieldKeys, useIntakeSchema } from "@/lib/intake/useIntakeSchema";
import { useTurnstileChallenge } from "@/lib/intake/useTurnstileChallenge";
import type {
  SanityFormSection,
  SanityPagination,
} from "@/lib/sanity/types";

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
  mode?: "create" | "redeem";
  redeemSubmissionId?: string;
  redeemSuccessUrl?: string;
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
  mode = "create",
  redeemSubmissionId,
  redeemSuccessUrl,
}: IntakeFormProps) {
  const draftScope =
    mode === "redeem" && redeemSubmissionId ? `gift-redeem.${redeemSubmissionId}` : readingId;

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
    draftScope,
    defaultValues,
    totalPages,
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
  const [consentSnapshot, setConsentSnapshot] = useState<LegalConsentSnapshot>(
    emptyConsentSnapshot,
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

  const {
    chipTick,
    valuesUntouched,
    flushSave,
    handleSaveLater,
    handleDiscardDraft,
  } = useAutosave({
    values,
    currentPage,
    defaultValues,
    defaultValuesSnapshot,
    isRestored,
    draftScope,
    readingId,
    setValues,
    setCurrentPage,
    setLastSavedAt,
    lastSavedAt,
    onAfterDiscard: () => {
      setErrors({});
      setSubmitError(null);
    },
  });

  const savedIndicator = <SavedIndicator lastSavedAt={lastSavedAt} chipTick={chipTick} />;

  const formRef = useRef<HTMLFormElement | null>(null);
  const submitIntentRef = useRef(false);

  useFieldFocusTelemetry({ formRef, readingId, currentPage });

  const isFirstPage = currentPage === 0;
  const isFinalPage = currentPage === totalPages - 1 || totalPages === 0;
  const currentSections = useMemo(
    () => pages[currentPage] ?? [],
    [pages, currentPage],
  );
  const currentKeys = useMemo(
    () => pageFieldKeys(currentSections),
    [currentSections],
  );

  useEffect(() => {
    if (!isRestored) return;
    if (totalPages === 0) return;
    track("intake_page_view", {
      reading_id: readingId,
      page_number: currentPage + 1,
      total_pages: totalPages,
    });
  }, [isRestored, readingId, currentPage, totalPages]);

  const currentPageValid = useMemo(
    () => validateCurrentPage(allFields, currentKeys, values).success,
    [allFields, currentKeys, values],
  );

  const { setValue, handleNext, handleBack, handleReviewEdit, handleSubmit } =
    useIntakeFormHandlers({
      mode,
      readingId,
      draftScope,
      redeemSubmissionId,
      redeemSuccessUrl,
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

  const renderContext = useMemo<RenderContext>(
    () => ({
      values,
      setValue,
      errors,
      disabled: isSubmitting,
      timeUnknownPairs,
      timeUnknownLabels,
      requestTurnstileToken: requestFreshTurnstileToken,
    }),
    [
      values,
      setValue,
      errors,
      isSubmitting,
      timeUnknownPairs,
      timeUnknownLabels,
      requestFreshTurnstileToken,
    ],
  );

  return (
    <>
      {swappedFromReadingName ? (
        <SwapToast
          readingName={swappedFromReadingName}
          onDismiss={dismissSwapToast}
        />
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
        currentPageValid={currentPageValid}
        valuesUntouched={valuesUntouched}
        values={values}
        pages={pages}
        currentSections={currentSections}
        pairedUnknownKeys={pairedUnknownKeys}
        renderContext={renderContext}
        lastSavedAt={lastSavedAt}
        savedIndicator={savedIndicator}
        consentSnapshot={consentSnapshot}
        setConsentSnapshot={setConsentSnapshot}
        consentErrors={consentErrors}
        clearConsentError={clearConsentError}
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

